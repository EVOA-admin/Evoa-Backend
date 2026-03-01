import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostWebsiteClick } from './entities/post-website-click.entity';
import { Startup } from '../startups/entities/startup.entity';
import { ReelView } from '../reels/entities/reel-view.entity';
import { User } from '../users/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postRepo: Repository<Post>,
        @InjectRepository(PostLike)
        private readonly postLikeRepo: Repository<PostLike>,
        @InjectRepository(PostComment)
        private readonly postCommentRepo: Repository<PostComment>,
        @InjectRepository(PostWebsiteClick)
        private readonly clickRepo: Repository<PostWebsiteClick>,
        @InjectRepository(Startup)
        private readonly startupRepo: Repository<Startup>,
        @InjectRepository(ReelView)
        private readonly reelViewRepo: Repository<ReelView>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    // ─────────────────────────────────────────────────── GET ALL POSTS ──────

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

    // ───────────────────────────────────────────────────── CREATE POST ───────

    async createPost(userId: string, dto: CreatePostDto) {
        // If user is a startup founder, link the post to their startup
        let startupId: string | undefined;
        try {
            const startup = await this.startupRepo.findOne({ where: { founderId: userId } });
            if (startup) startupId = startup.id;
        } catch (_) { /* non-critical */ }

        const post = this.postRepo.create({
            userId,
            ...(startupId ? { startupId } : {}),
            imageUrl: dto.imageUrl,
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
}
