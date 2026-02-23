import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Startup } from '../startups/entities/startup.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Reel } from '../reels/entities/reel.entity';
import { Hashtag } from './entities/hashtag.entity';
import { RedisService } from '../config/redis.config';

@Injectable()
export class ExploreService {
    constructor(
        @InjectRepository(Startup)
        private readonly startupRepository: Repository<Startup>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Reel)
        private readonly reelRepository: Repository<Reel>,
        @InjectRepository(Hashtag)
        private readonly hashtagRepository: Repository<Hashtag>,
        @Inject('REDIS_CLIENT')
        private readonly redisClient: any,
    ) { }

    private redisService = new RedisService(this.redisClient);

    async search(query: string, type: string = 'all') {
        const cleanQuery = query.toLowerCase().replace(/^#/, '').trim();
        const cacheKey = `search:${type}:${cleanQuery}`;
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        let results: any = {};

        // Always search startups by name / description / industry
        const startupResults = await this.startupRepository.find({
            where: [
                { name: Like(`%${cleanQuery}%`) },
                { description: Like(`%${cleanQuery}%`) },
                { industry: Like(`%${cleanQuery}%`) },
            ],
            relations: ['founder'],
            take: 20,
        });

        // Search reels whose hashtags array contains the query tag
        // Uses PostgreSQL array overlap: hashtags && ARRAY['tag']
        const reelResults = await this.reelRepository
            .createQueryBuilder('reel')
            .leftJoinAndSelect('reel.startup', 'startup')
            .leftJoinAndSelect('startup.founder', 'founder')
            .where(`reel.hashtags @> ARRAY[:tag]::text[]`, { tag: cleanQuery })
            .orWhere(`reel.title ILIKE :q`, { q: `%${cleanQuery}%` })
            .orWhere(`reel.description ILIKE :q`, { q: `%${cleanQuery}%` })
            .andWhere('reel.deletedAt IS NULL')
            .orderBy('reel.likeCount', 'DESC')
            .take(30)
            .getMany();

        // Also search by partial hashtag match using LIKE on the array cast
        const hashtagReels = await this.reelRepository
            .createQueryBuilder('reel')
            .leftJoinAndSelect('reel.startup', 'startup')
            .leftJoinAndSelect('startup.founder', 'founder')
            .where(`EXISTS (SELECT 1 FROM unnest(reel.hashtags) h WHERE h ILIKE :ht)`, { ht: `%${cleanQuery}%` })
            .andWhere('reel.deletedAt IS NULL')
            .orderBy('reel.likeCount', 'DESC')
            .take(30)
            .getMany();

        // Deduplicate reels by id
        const reelMap = new Map<string, any>();
        [...reelResults, ...hashtagReels].forEach(r => reelMap.set(r.id, r));
        const dedupedReels = Array.from(reelMap.values());

        results = {
            startups: startupResults,
            reels: dedupedReels,
            // Collect all matching hashtags from the found reels for display
            hashtags: [...new Set(
                dedupedReels.flatMap(r => r.hashtags || []).filter(h => h.includes(cleanQuery))
            )].slice(0, 20),
        };

        // Cache for 5 minutes
        await this.redisService.set(cacheKey, JSON.stringify(results), 300);

        return results;
    }

    async getTrendingHashtags() {
        const cacheKey = 'trending:hashtags';
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const hashtags = await this.hashtagRepository.find({
            order: { usageCount: 'DESC' },
            take: 20,
        });

        // Cache for 15 minutes
        await this.redisService.set(cacheKey, JSON.stringify(hashtags), 900);

        return hashtags;
    }

    async getTopStartups() {
        const cacheKey = 'top:startups';
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const startups = await this.startupRepository.find({
            relations: ['founder', 'reels'],
            order: { followerCount: 'DESC' },
            take: 20,
        });

        // Cache for 30 minutes
        await this.redisService.set(cacheKey, JSON.stringify(startups), 1800);

        return startups;
    }

    async getStartupsOfTheWeek() {
        const cacheKey = 'startups:week';
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        // Get startups created in the last 7 days, sorted by follower count
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const startups = await this.startupRepository
            .createQueryBuilder('startup')
            .leftJoinAndSelect('startup.founder', 'founder')
            .leftJoinAndSelect('startup.reels', 'reels')
            .where('startup.createdAt >= :date', { date: oneWeekAgo })
            .orderBy('startup.followerCount', 'DESC')
            .take(10)
            .getMany();

        // Cache for 1 hour
        await this.redisService.set(cacheKey, JSON.stringify(startups), 3600);

        return startups;
    }

    async getInvestorSpotlight() {
        const cacheKey = 'investors:spotlight';
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const investors = await this.userRepository.find({
            where: { role: In([UserRole.INVESTOR, UserRole.INCUBATOR]) },
            take: 10,
        });

        // Cache for 1 hour
        await this.redisService.set(cacheKey, JSON.stringify(investors), 3600);

        return investors;
    }

    async getLiveBattleground() {
        const cacheKey = 'battleground:live';
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        // Get featured reels or top performing reels
        const reels = await this.reelRepository.find({
            where: { isFeatured: true },
            relations: ['startup', 'startup.founder'],
            order: { likeCount: 'DESC' },
            take: 10,
        });

        // Cache for 5 minutes
        await this.redisService.set(cacheKey, JSON.stringify(reels), 300);

        return reels;
    }
}
