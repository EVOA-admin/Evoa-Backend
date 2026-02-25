import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postRepository: Repository<Post>,
        @InjectRepository(PostLike)
        private readonly postLikeRepository: Repository<PostLike>,
    ) { }

    /** Get all recent posts — newest first, with isLiked flag for the requesting user */
    async getAllPosts(requestingUserId: string, limit = 50, offset = 0) {
        const posts = await this.postRepository.find({
            where: { deletedAt: IsNull() },
            relations: ['user'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });

        if (!posts.length) return [];

        // Batch-fetch which posts the current user has liked
        const postIds = posts.map(p => p.id);
        const likes = await this.postLikeRepository.find({
            where: postIds.map(id => ({ postId: id, userId: requestingUserId })),
        });

        const likedSet = new Set(likes.map(l => l.postId));

        return posts.map(p => ({
            ...p,
            isLiked: likedSet.has(p.id),
        }));
    }

    /** Create a new post for this user */
    async createPost(userId: string, dto: CreatePostDto) {
        const post = this.postRepository.create({
            userId,
            imageUrl: dto.imageUrl,
            caption: dto.caption || '',
            hashtags: (dto.hashtags || []).map(h => h.replace(/^#/, '').toLowerCase()),
        });
        await this.postRepository.save(post);
        return { message: 'Post created', post };
    }

    /** Get the current user's posts */
    async getMyPosts(userId: string) {
        const posts = await this.postRepository.find({
            where: { userId, deletedAt: IsNull() },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });

        if (!posts.length) return [];

        const postIds = posts.map(p => p.id);
        const likes = await this.postLikeRepository.find({
            where: postIds.map(id => ({ postId: id, userId })),
        });
        const likedSet = new Set(likes.map(l => l.postId));
        return posts.map(p => ({ ...p, isLiked: likedSet.has(p.id) }));
    }

    /** Get posts by any userId */
    async getUserPosts(userId: string, requestingUserId?: string) {
        const posts = await this.postRepository.find({
            where: { userId, deletedAt: IsNull() },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });

        if (!posts.length) return [];
        if (!requestingUserId) return posts.map(p => ({ ...p, isLiked: false }));

        const postIds = posts.map(p => p.id);
        const likes = await this.postLikeRepository.find({
            where: postIds.map(id => ({ postId: id, userId: requestingUserId })),
        });
        const likedSet = new Set(likes.map(l => l.postId));
        return posts.map(p => ({ ...p, isLiked: likedSet.has(p.id) }));
    }

    /**
     * Like a post — idempotent (safe to call multiple times, count only increments once per user).
     */
    async likePost(postId: string, userId: string) {
        const post = await this.postRepository.findOne({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post not found');

        // Check if already liked — if so, do nothing (no duplicate increments)
        const existing = await this.postLikeRepository.findOne({
            where: { postId, userId },
        });

        if (!existing) {
            // Save the like row first
            const like = this.postLikeRepository.create({ postId, userId });
            await this.postLikeRepository.save(like);
            // Then increment the denormalized counter
            await this.postRepository.increment({ id: postId }, 'likeCount', 1);
        }

        return { message: 'Post liked' };
    }

    /** Unlike a post — idempotent (safe if already unliked) */
    async unlikePost(postId: string, userId: string) {
        const post = await this.postRepository.findOne({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post not found');

        const deleted = await this.postLikeRepository.delete({ postId, userId });

        // Only decrement if we actually removed a row and count is > 0
        if ((deleted.affected ?? 0) > 0 && post.likeCount > 0) {
            await this.postRepository.decrement({ id: postId }, 'likeCount', 1);
        }

        return { message: 'Post unliked' };
    }
}
