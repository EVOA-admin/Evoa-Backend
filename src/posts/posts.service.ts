import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostSave } from './entities/post-save.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostWebsiteClick } from './entities/post-website-click.entity';
import { PostShare } from './entities/post-share.entity';
import { Startup } from '../startups/entities/startup.entity';
import { StartupProfileVisit } from '../startups/entities/startup-profile-visit.entity';
import { Reel } from '../reels/entities/reel.entity';
import { ReelLike } from '../reels/entities/reel-like.entity';
import { ReelComment } from '../reels/entities/reel-comment.entity';
import { ReelShare } from '../reels/entities/reel-share.entity';
import { ReelView } from '../reels/entities/reel-view.entity';
import { User } from '../users/entities/user.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postRepo: Repository<Post>,
        @InjectRepository(PostLike)
        private readonly postLikeRepo: Repository<PostLike>,
        @InjectRepository(PostSave)
        private readonly postSaveRepo: Repository<PostSave>,
        @InjectRepository(PostComment)
        private readonly postCommentRepo: Repository<PostComment>,
        @InjectRepository(PostWebsiteClick)
        private readonly clickRepo: Repository<PostWebsiteClick>,
        @InjectRepository(PostShare)
        private readonly postShareRepo: Repository<PostShare>,
        @InjectRepository(Startup)
        private readonly startupRepo: Repository<Startup>,
        @InjectRepository(StartupProfileVisit)
        private readonly startupProfileVisitRepo: Repository<StartupProfileVisit>,
        @InjectRepository(Reel)
        private readonly reelRepo: Repository<Reel>,
        @InjectRepository(ReelLike)
        private readonly reelLikeRepo: Repository<ReelLike>,
        @InjectRepository(ReelComment)
        private readonly reelCommentRepo: Repository<ReelComment>,
        @InjectRepository(ReelShare)
        private readonly reelShareRepo: Repository<ReelShare>,
        @InjectRepository(ReelView)
        private readonly reelViewRepo: Repository<ReelView>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,
    ) { }

    // ────────────────────────────────────────────────── DELETE POST ──────────

    async deletePost(postId: string, userId: string) {
        const post = await this.postRepo.findOne({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post not found');
        if (post.userId !== userId) {
            const { ForbiddenException } = await import('@nestjs/common');
            throw new ForbiddenException('You can only delete your own posts');
        }
        await this.postRepo.softDelete({ id: postId });
        return { message: 'Post deleted' };
    }

    // ─────────────────────────────────────────────────── GET ALL POSTS ──────

    async getRisingStartups() {
        const since = new Date();
        since.setDate(since.getDate() - 7);

        const startups = await this.startupRepo.find({
            where: { deletedAt: IsNull() },
            order: { name: 'ASC' },
        });

        if (!startups.length) return [];

        const startupMap = new Map<string, any>();
        const startupIds = startups.map((startup) => startup.id);

        startups.forEach((startup) => {
            startupMap.set(startup.id, {
                startupId: startup.id,
                founderId: startup.founderId,
                name: startup.name || 'Startup',
                username: startup.username || null,
                logoUrl: startup.logoUrl || null,
                tagline: startup.tagline || null,
                postCount: 0,
                activeDays: new Set<string>(),
                likes: 0,
                comments: 0,
                shares: 0,
                profileVisits: 0,
            });
        });

        const allPosts = await this.postRepo
            .createQueryBuilder('post')
            .innerJoin('post.user', 'user')
            .leftJoin(Startup, 'startup', 'startup.id = post.startup_id OR startup.founder_id = post.user_id')
            .select([
                'post.id AS "postId"',
                'post.user_id AS "userId"',
                'post.created_at AS "createdAt"',
                'startup.id AS "startupId"',
                'startup.founder_id AS "founderId"',
                'startup.name AS "startupName"',
                'startup.username AS "username"',
                'startup.logo_url AS "logoUrl"',
                'startup.tagline AS "tagline"',
            ])
            .where('post.deleted_at IS NULL')
            .andWhere("(post.startup_id IS NOT NULL OR user.role = 'startup')")
            .andWhere('startup.deleted_at IS NULL')
            .andWhere('post.created_at >= :since', { since })
            .orderBy('post.created_at', 'DESC')
            .getRawMany();

        const postIds = allPosts.map((post) => post.postId);
        const allReels = await this.reelRepo
            .createQueryBuilder('reel')
            .select([
                'reel.id AS "reelId"',
                'reel.startup_id AS "startupId"',
                'reel.created_at AS "createdAt"',
            ])
            .where('reel.deleted_at IS NULL')
            .andWhere('reel.startup_id IN (:...startupIds)', { startupIds })
            .andWhere('reel.created_at >= :since', { since })
            .orderBy('reel.created_at', 'DESC')
            .getRawMany();
        const reelIds = allReels.map((reel) => reel.reelId);

        for (const post of allPosts) {
            if (!post.startupId) continue;
            const startup = startupMap.get(post.startupId);
            if (!startup) continue;
            startup.postCount += 1;
            startup.activeDays.add(new Date(post.createdAt).toISOString().slice(0, 10));
        }

        for (const reel of allReels) {
            if (!reel.startupId) continue;
            const startup = startupMap.get(reel.startupId);
            if (!startup) continue;
            startup.postCount += 1;
            startup.activeDays.add(new Date(reel.createdAt).toISOString().slice(0, 10));
        }

        const likes = postIds.length
            ? await this.postLikeRepo
                .createQueryBuilder('like')
                .innerJoin('like.post', 'post')
                .leftJoin(Startup, 'startup', 'startup.id = post.startup_id OR startup.founder_id = post.user_id')
                .select('startup.id', 'startupId')
                .addSelect('COUNT(like.id)', 'count')
                .where('post.deleted_at IS NULL')
                .andWhere('post.id IN (:...postIds)', { postIds })
                .andWhere('like.user_id <> post.user_id')
                .andWhere('like.created_at >= :since', { since })
                .groupBy('startup.id')
                .getRawMany()
            : [];

        const comments = postIds.length
            ? await this.postCommentRepo
                .createQueryBuilder('comment')
                .innerJoin('comment.post', 'post')
                .leftJoin(Startup, 'startup', 'startup.id = post.startup_id OR startup.founder_id = post.user_id')
                .select('startup.id', 'startupId')
                .addSelect(`COUNT(DISTINCT CONCAT(comment.user_id, ':', comment.post_id, ':', DATE(comment.created_at)))`, 'count')
                .where('comment.deleted_at IS NULL')
                .andWhere('post.deleted_at IS NULL')
                .andWhere('post.id IN (:...postIds)', { postIds })
                .andWhere('comment.user_id <> post.user_id')
                .andWhere('comment.created_at >= :since', { since })
                .groupBy('startup.id')
                .getRawMany()
            : [];

        const shares = postIds.length
            ? await this.postShareRepo
                .createQueryBuilder('share')
                .innerJoin('share.post', 'post')
                .leftJoin(Startup, 'startup', 'startup.id = post.startup_id OR startup.founder_id = post.user_id')
                .select('startup.id', 'startupId')
                .addSelect('COUNT(share.id)', 'count')
                .where('post.deleted_at IS NULL')
                .andWhere('post.id IN (:...postIds)', { postIds })
                .andWhere('share.user_id <> post.user_id')
                .andWhere('share.created_at >= :since', { since })
                .groupBy('startup.id')
                .getRawMany()
            : [];

        const profileVisits = await this.startupProfileVisitRepo
            .createQueryBuilder('visit')
            .select('visit.startup_id', 'startupId')
            .addSelect('COUNT(visit.id)', 'count')
            .where('visit.startup_id IN (:...startupIds)', { startupIds })
            .andWhere('visit.created_at >= :since', { since })
            .groupBy('visit.startup_id')
            .getRawMany();

        const reelLikes = reelIds.length
            ? await this.reelLikeRepo
                .createQueryBuilder('like')
                .innerJoin('like.reel', 'reel')
                .innerJoin('reel.startup', 'startup')
                .select('startup.id', 'startupId')
                .addSelect('COUNT(like.id)', 'count')
                .where('reel.deleted_at IS NULL')
                .andWhere('reel.id IN (:...reelIds)', { reelIds })
                .andWhere('like.user_id <> startup.founder_id')
                .andWhere('like.created_at >= :since', { since })
                .groupBy('startup.id')
                .getRawMany()
            : [];

        const reelComments = reelIds.length
            ? await this.reelCommentRepo
                .createQueryBuilder('comment')
                .innerJoin('comment.reel', 'reel')
                .innerJoin('reel.startup', 'startup')
                .select('startup.id', 'startupId')
                .addSelect(`COUNT(DISTINCT CONCAT(comment.user_id, ':', comment.reel_id, ':', DATE(comment.created_at)))`, 'count')
                .where('comment.deleted_at IS NULL')
                .andWhere('reel.deleted_at IS NULL')
                .andWhere('reel.id IN (:...reelIds)', { reelIds })
                .andWhere('comment.user_id <> startup.founder_id')
                .andWhere('comment.created_at >= :since', { since })
                .groupBy('startup.id')
                .getRawMany()
            : [];

        const reelShares = reelIds.length
            ? await this.reelShareRepo
                .createQueryBuilder('share')
                .innerJoin('share.reel', 'reel')
                .innerJoin('reel.startup', 'startup')
                .select('startup.id', 'startupId')
                .addSelect('COUNT(share.id)', 'count')
                .where('reel.deleted_at IS NULL')
                .andWhere('reel.id IN (:...reelIds)', { reelIds })
                .andWhere('share.user_id <> startup.founder_id')
                .andWhere('share.created_at >= :since', { since })
                .groupBy('startup.id')
                .getRawMany()
            : [];

        const applyCount = (rows: { startupId: string; count: string }[], key: 'likes' | 'comments' | 'shares' | 'profileVisits') => {
            rows.forEach((row) => {
                const startup = startupMap.get(row.startupId);
                if (startup) startup[key] += Number(row.count || 0);
            });
        };

        applyCount(likes, 'likes');
        applyCount(comments, 'comments');
        applyCount(shares, 'shares');
        applyCount(profileVisits, 'profileVisits');
        applyCount(reelLikes, 'likes');
        applyCount(reelComments, 'comments');
        applyCount(reelShares, 'shares');

        return Array.from(startupMap.values())
            .map((startup) => {
                const consistencyDays = startup.activeDays.size;
                const trendingScore = (startup.postCount * 5)
                    + startup.likes
                    + (startup.comments * 3)
                    + (startup.shares * 4)
                    + (startup.profileVisits * 2)
                    + consistencyDays;

                return {
                    startupId: startup.startupId,
                    founderId: startup.founderId,
                    name: startup.name,
                    username: startup.username,
                    logoUrl: startup.logoUrl,
                    tagline: startup.tagline,
                    trendingScore,
                    metrics: {
                        posts: startup.postCount,
                        likes: startup.likes,
                        comments: startup.comments,
                        shares: startup.shares,
                        profileVisits: startup.profileVisits,
                        activeDays: consistencyDays,
                    },
                };
            })
            .sort((a, b) => {
                if (b.trendingScore !== a.trendingScore) return b.trendingScore - a.trendingScore;
                if (b.metrics.posts !== a.metrics.posts) return b.metrics.posts - a.metrics.posts;
                if (b.metrics.profileVisits !== a.metrics.profileVisits) return b.metrics.profileVisits - a.metrics.profileVisits;
                return a.name.localeCompare(b.name);
            })
            .map((startup, index) => ({ ...startup, rank: index + 1 }));
    }

    async getAllPosts(requestingUserId: string, limit = 50, offset = 0) {
        const posts = await this.postRepo.find({
            where: { deletedAt: IsNull() },
            relations: ['user'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });

        if (!posts.length) return [];

        const postIds = posts.map(p => p.id);

        // 1. Batch-fetch which posts this user has liked
        const likes = await this.postLikeRepo.find({
            where: postIds.map(id => ({ postId: id, userId: requestingUserId })),
        });
        const likedSet = new Set(likes.map(l => l.postId));

        // 2. Identify startup posts — either via direct startupId or user.role === 'startup'
        const startupPosts = posts.filter(p => p.startupId || p.user?.role === 'startup');
        const startupPostIds = startupPosts.map(p => p.id);

        // Collect all startup IDs we need to load
        const directStartupIds = [...new Set(posts.filter(p => p.startupId).map(p => p.startupId))];
        // For legacy posts (no startupId), look up by founderId
        const founderUserIds = [...new Set(
            posts
                .filter(p => !p.startupId && p.user?.role === 'startup')
                .map(p => p.userId),
        )];

        // Map startupId → startup record
        const startupByIdMap = new Map<string, Startup>();
        // Map founderId → startup record (for legacy posts)
        const startupByFounderMap = new Map<string, Startup>();

        if (directStartupIds.length) {
            const startups = await this.startupRepo.findBy({ id: In(directStartupIds) });
            startups.forEach(s => startupByIdMap.set(s.id, s));
        }
        if (founderUserIds.length) {
            const startups = await this.startupRepo.find({ where: founderUserIds.map(uid => ({ founderId: uid })) });
            startups.forEach(s => startupByFounderMap.set(s.founderId, s));
        }

        // All distinct startupIds for pitch-view counts
        const allStartupIds = [
            ...directStartupIds,
            ...[...startupByFounderMap.values()].map(s => s.id),
        ].filter(Boolean);

        // 3. Pitch views: count reel_views where viewer.role IN (investor, incubator)
        const pitchViewMap = new Map<string, number>(); // startupId → count
        if (allStartupIds.length) {
            const rows: { startupId: string; cnt: string }[] = await this.reelViewRepo
                .createQueryBuilder('rv')
                .innerJoin('rv.reel', 'reel')
                .innerJoin('rv.user', 'viewer')
                .select('reel.startup_id', 'startupId')
                .addSelect('COUNT(rv.id)', 'cnt')
                .where('reel.startup_id IN (:...sids)', { sids: allStartupIds })
                .andWhere('viewer.role IN (:...roles)', { roles: ['investor', 'incubator'] })
                .groupBy('reel.startup_id')
                .getRawMany();
            rows.forEach(r => pitchViewMap.set(r.startupId, parseInt(r.cnt, 10)));
        }

        // 4. Investor thoughts: latest 4 comments per startup post
        const thoughtsMap = new Map<string, { name: string; avatar: string }[]>(); // postId → avatars
        if (startupPostIds.length) {
            const thoughts = await this.postCommentRepo
                .createQueryBuilder('pc')
                .innerJoin('pc.user', 'u')
                .select([
                    'pc.post_id as "postId"',
                    'u.full_name as "name"',
                    'u.avatar_url as "avatar"',
                    'pc.created_at as "createdAt"',
                ])
                .where('pc.post_id IN (:...ids)', { ids: startupPostIds })
                .andWhere('u.role IN (:...roles)', { roles: ['investor', 'incubator'] })
                .andWhere('pc.deleted_at IS NULL')
                .orderBy('pc.created_at', 'DESC')
                .getRawMany();

            thoughts.forEach(t => {
                const arr = thoughtsMap.get(t.postId) || [];
                if (arr.length < 4) arr.push({ name: t.name, avatar: t.avatar });
                thoughtsMap.set(t.postId, arr);
            });
        }

        return posts.map(p => {
            const base = { ...p, isLiked: likedSet.has(p.id) };

            const isStartupPost = !!(p.startupId || p.user?.role === 'startup');
            if (!isStartupPost) return base;

            // Resolve startup data — either by startupId or by founderId (legacy posts)
            const startup = p.startupId
                ? startupByIdMap.get(p.startupId)
                : startupByFounderMap.get(p.userId);

            const resolvedStartupId = startup?.id;

            return {
                ...base,
                startupId: resolvedStartupId || p.startupId,
                startupName: startup?.name || p.user?.fullName,
                startupLogo: startup?.logoUrl || p.user?.avatarUrl || null,
                tagline: startup?.tagline || null,
                website: startup?.website || startup?.socialLinks?.website || null,
                sectors: startup?.industries?.length ? startup.industries : (startup?.categoryTags || []),
                pitchViews: resolvedStartupId ? (pitchViewMap.get(resolvedStartupId) ?? 0) : 0,
                supporters: startup?.followerCount ?? 0,
                clickThrough: p.clickThroughCount ?? 0,
                investorThoughts: thoughtsMap.get(p.id) || [],
            };
        });
    }

    async getPostById(postId: string, requestingUserId: string) {
        const post = await this.postRepo.findOne({
            where: { id: postId, deletedAt: IsNull() },
            relations: ['user'],
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        const [liked, startup] = await Promise.all([
            this.postLikeRepo.findOne({ where: { postId, userId: requestingUserId } }),
            post.startupId
                ? this.startupRepo.findOne({ where: { id: post.startupId } })
                : post.user?.role === 'startup'
                    ? this.startupRepo.findOne({ where: { founderId: post.userId } })
                    : Promise.resolve(null),
        ]);

        const basePost = { ...post, isLiked: !!liked };

        if (!startup) {
            return basePost;
        }

        return {
            ...basePost,
            startupId: startup.id,
            startupName: startup.name || post.user?.fullName,
            startupLogo: startup.logoUrl || post.user?.avatarUrl || null,
            tagline: startup.tagline || null,
            website: startup.website || startup.socialLinks?.website || null,
            sectors: startup.industries?.length ? startup.industries : (startup.categoryTags || []),
            pitchViews: 0,
            supporters: startup.followerCount ?? 0,
            clickThrough: post.clickThroughCount ?? 0,
            investorThoughts: [],
        };
    }

    // ───────────────────────────────────────────────────── CREATE POST ───────

    async createPost(userId: string, dto: CreatePostDto) {
        // If user is a startup founder, link the post to their startup
        let startupId: string | undefined;
        try {
            const startup = await this.startupRepo.findOne({ where: { founderId: userId } });
            if (startup) startupId = startup.id;
        } catch (_) { /* non-critical */ }

        // Normalise image fields:
        //   - imageUrls takes priority when supplied (multi-photo)
        //   - imageUrl is kept as the primary/first image for backwards compat
        const imageUrls = dto.imageUrls?.length
            ? dto.imageUrls
            : dto.imageUrl ? [dto.imageUrl] : [];
        const imageUrl = imageUrls[0] ?? dto.imageUrl ?? null;

        const post = this.postRepo.create({
            userId,
            ...(startupId ? { startupId } : {}),
            imageUrl,
            imageUrls,
            caption: dto.caption || '',
            hashtags: (dto.hashtags || []).map(h => h.replace(/^#/, '').toLowerCase()),
        });
        await this.postRepo.save(post);
        return { message: 'Post created', post };
    }

    // ──────────────────────────────────────────────────── MY / USER POSTS ───

    async getMyPosts(userId: string) {
        const posts = await this.postRepo.find({
            where: { userId, deletedAt: IsNull() },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
        if (!posts.length) return [];
        const postIds = posts.map(p => p.id);
        const likes = await this.postLikeRepo.find({
            where: postIds.map(id => ({ postId: id, userId })),
        });
        const likedSet = new Set(likes.map(l => l.postId));
        return posts.map(p => ({ ...p, isLiked: likedSet.has(p.id) }));
    }

    async getUserPosts(userId: string, requestingUserId?: string) {
        const posts = await this.postRepo.find({
            where: { userId, deletedAt: IsNull() },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
        if (!posts.length) return [];
        if (!requestingUserId) return posts.map(p => ({ ...p, isLiked: false }));
        const postIds = posts.map(p => p.id);
        const likes = await this.postLikeRepo.find({
            where: postIds.map(id => ({ postId: id, userId: requestingUserId })),
        });
        const likedSet = new Set(likes.map(l => l.postId));
        return posts.map(p => ({ ...p, isLiked: likedSet.has(p.id) }));
    }

    // ─────────────────────────────────────────────────────────── LIKES ───────

    async likePost(postId: string, userId: string) {
        const post = await this.postRepo.findOne({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post not found');

        const existing = await this.postLikeRepo.findOne({ where: { postId, userId } });
        if (!existing) {
            await this.postLikeRepo.save(this.postLikeRepo.create({ postId, userId }));
            await this.postRepo.increment({ id: postId }, 'likeCount', 1);

            // Notify the post owner — skip if they liked their own post
            if (post.userId !== userId) {
                try {
                    const liker = await this.userRepo.findOne({ where: { id: userId } });
                    const likerName = liker?.fullName || liker?.email?.split('@')[0] || 'Someone';
                    await this.notificationRepo.save(
                        this.notificationRepo.create({
                            userId: post.userId,
                            type: NotificationType.PITCH,
                            title: 'New Like',
                            message: `${likerName} liked your post`,
                            link: `/post/${postId}`,
                            actorId: userId,
                        }),
                    );
                } catch (_) { /* non-critical — never block the like */ }
            }
        }
        return { message: 'Post liked' };
    }

    async unlikePost(postId: string, userId: string) {
        const post = await this.postRepo.findOne({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post not found');

        const deleted = await this.postLikeRepo.delete({ postId, userId });
        if ((deleted.affected ?? 0) > 0 && post.likeCount > 0) {
            await this.postRepo.decrement({ id: postId }, 'likeCount', 1);
        }
        return { message: 'Post unliked' };
    }

    // ───────────────────────────────────────────────── WEBSITE CLICKTHROUGH ──

    /**
     * Record a unique website click for a post.
     * Idempotent — only counts the first click per user.
     */
    async recordWebsiteClick(postId: string, userId: string) {
        const post = await this.postRepo.findOne({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post not found');

        const existing = await this.clickRepo.findOne({ where: { postId, userId } });
        if (!existing) {
            await this.clickRepo.save(this.clickRepo.create({ postId, userId }));
            await this.postRepo.increment({ id: postId }, 'clickThroughCount', 1);
        }
        return { message: 'Click recorded', clickThrough: post.clickThroughCount + (existing ? 0 : 1) };
    }

    /**
     * Record a post view — increments viewCount every time this post is opened.
     */
    async recordPostView(postId: string) {
        await this.postRepo.increment({ id: postId }, 'viewCount', 1);
        return { message: 'View recorded' };
    }

    async sharePost(postId: string, userId: string, platform = 'copy_link') {
        const post = await this.postRepo.findOne({ where: { id: postId, deletedAt: IsNull() } });
        if (!post) throw new NotFoundException('Post not found');

        const shareDate = new Date().toISOString().slice(0, 10);
        const existing = await this.postShareRepo.findOne({ where: { postId, userId, shareDate } });

        if (!existing) {
            await this.postShareRepo.save(this.postShareRepo.create({ postId, userId, platform, shareDate }));
            await this.postRepo.increment({ id: postId }, 'shareCount', 1);
        }

        return { message: 'Post shared', shareCount: post.shareCount + (existing ? 0 : 1) };
    }


    // ────────────────────────────────────────────────────────── COMMENTS ─────

    /**
     * Add a comment to a post. Any role can comment, but only investor/incubator
     * comments will be returned as "Investor's Thoughts" in the feed.
     */
    async addComment(postId: string, userId: string, content: string) {
        const post = await this.postRepo.findOne({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post not found');
        if (!content?.trim()) throw new BadRequestException('Comment content cannot be empty');

        const comment = this.postCommentRepo.create({ postId, userId, content: content.trim() });
        await this.postCommentRepo.save(comment);
        await this.postRepo.increment({ id: postId }, 'commentCount', 1);

        // Notify the post owner — skip if they commented on their own post
        if (post.userId !== userId) {
            try {
                const commenter = await this.userRepo.findOne({ where: { id: userId } });
                const commenterName = commenter?.fullName || commenter?.email?.split('@')[0] || 'Someone';
                const preview = content.trim().length > 50
                    ? content.trim().slice(0, 50) + '…'
                    : content.trim();
                await this.notificationRepo.save(
                    this.notificationRepo.create({
                        userId: post.userId,
                        type: NotificationType.PITCH,
                        title: 'New Comment',
                        message: `${commenterName} commented: "${preview}"`,
                        link: `/post/${postId}`,
                        actorId: userId,
                    }),
                );
            } catch (_) { /* non-critical */ }
        }

        return { message: 'Comment added', comment };
    }

    /**
     * Get all comments on a post (public, all roles).
     * Each comment includes commenter user info.
     */
    async getComments(postId: string) {
        return this.postCommentRepo.find({
            where: { postId, deletedAt: IsNull() },
            relations: ['user'],
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * Get ONLY investor/incubator comments — the "Investor's Thoughts" section.
     * Returns avatars + names for the summary bar.
     */
    async getInvestorThoughts(postId: string) {
        return this.postCommentRepo
            .createQueryBuilder('pc')
            .innerJoin('pc.user', 'u')
            .select([
                'pc.id as id',
                'pc.content as content',
                'pc.createdAt as "createdAt"',
                'u.id as "userId"',
                'u.fullName as name',
                'u.avatarUrl as avatar',
                'u.role as role',
            ])
            .where('pc.post_id = :postId', { postId })
            .andWhere('u.role IN (:...roles)', { roles: ['investor', 'incubator'] })
            .andWhere('pc.deleted_at IS NULL')
            .orderBy('pc.createdAt', 'DESC')
            .getRawMany();
    }

    // ────────────────────────────────────────────────────────────── SAVES ─────

    async savePost(postId: string, userId: string) {
        const post = await this.postRepo.findOne({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post not found');

        const existing = await this.postSaveRepo.findOne({ where: { postId, userId } });
        if (existing) return { message: 'Already saved' };

        const save = this.postSaveRepo.create({ postId, userId });
        await this.postSaveRepo.save(save);
        return { message: 'Post saved', isSaved: true };
    }

    async unsavePost(postId: string, userId: string) {
        const save = await this.postSaveRepo.findOne({ where: { postId, userId } });
        if (!save) return { message: 'Not saved' };

        await this.postSaveRepo.delete({ id: save.id });
        return { message: 'Post unsaved', isSaved: false };
    }
}
