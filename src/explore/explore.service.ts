import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Startup } from '../startups/entities/startup.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Reel } from '../reels/entities/reel.entity';
import { Hashtag } from './entities/hashtag.entity';
import { Investor } from '../investors/entities/investor.entity';
import { Incubator } from '../incubators/entities/incubator.entity';
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
        @InjectRepository(Investor)
        private readonly investorRepository: Repository<Investor>,
        @InjectRepository(Incubator)
        private readonly incubatorRepository: Repository<Incubator>,
        @Inject('REDIS_CLIENT')
        private readonly redisClient: any,
    ) { }

    private redisService = new RedisService(this.redisClient);

    /** Safe Redis get — never throws */
    private async cacheGet(key: string): Promise<any | null> {
        try {
            const cached = await this.redisService.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    }

    /** Safe Redis set — never throws */
    private async cacheSet(key: string, value: any, ttl: number): Promise<void> {
        try {
            await this.redisService.set(key, JSON.stringify(value), ttl);
        } catch {
            // Redis unavailable — skip caching, don't break the response
        }
    }

    async search(query: string, type: string = 'all') {
        const cleanQuery = (query || '').toLowerCase().replace(/^#/, '').trim();

        if (!cleanQuery) {
            return { users: [], startups: [], investors: [], incubators: [], reels: [], hashtags: [] };
        }

        const cacheKey = `search:${type}:${cleanQuery}`;
        const cached = await this.cacheGet(cacheKey);
        if (cached) return cached;

        const q = `%${cleanQuery}%`;

        // ── 1. Startups ──────────────────────────────────────────────
        const startupResults = await this.startupRepository
            .createQueryBuilder('startup')
            .leftJoinAndSelect('startup.founder', 'founder')
            .where('startup.name ILIKE :q', { q })
            .orWhere('startup.tagline ILIKE :q', { q })
            .orWhere('startup.description ILIKE :q', { q })
            .orWhere('startup.industry ILIKE :q', { q })
            .orWhere('startup.username ILIKE :q', { q })
            .orWhere(`EXISTS (SELECT 1 FROM unnest(startup.industries) ind WHERE ind ILIKE :q)`, { q })
            .andWhere('startup.deletedAt IS NULL')
            .take(20)
            .getMany();

        // ── 2. Investors (join user to get avatarUrl) ─────────────────
        const investorResults = await this.investorRepository
            .createQueryBuilder('investor')
            .leftJoinAndSelect('investor.user', 'user')
            .where('investor.name ILIKE :q', { q })
            .orWhere('investor.companyName ILIKE :q', { q })
            .orWhere('investor.tagline ILIKE :q', { q })
            .orWhere('investor.description ILIKE :q', { q })
            .orWhere('investor.designation ILIKE :q', { q })
            .orWhere(`EXISTS (SELECT 1 FROM unnest(investor.sectors) sec WHERE sec ILIKE :q)`, { q })
            .take(20)
            .getMany();

        // ── 3. Incubators — NO `name` column, search user.fullName ────
        // Incubator entity only has: programTypes, tagline, officialEmail,
        // description, website, logoUrl, sectors, stages, and userId (FK to users).
        // We join the users table to search by full_name / email.
        const incubatorResults = await this.incubatorRepository
            .createQueryBuilder('incubator')
            .leftJoinAndSelect('incubator.user', 'user')
            .where('user.fullName ILIKE :q', { q })
            .orWhere('user.email ILIKE :q', { q })
            .orWhere('incubator.tagline ILIKE :q', { q })
            .orWhere('incubator.description ILIKE :q', { q })
            .orWhere('incubator.officialEmail ILIKE :q', { q })
            .orWhere('incubator.organizationType ILIKE :q', { q })
            .orWhere(`EXISTS (SELECT 1 FROM unnest(incubator.sectors) sec WHERE sec ILIKE :q)`, { q })
            .orWhere(`EXISTS (SELECT 1 FROM unnest(incubator.programTypes) pt WHERE pt ILIKE :q)`, { q })
            .take(20)
            .getMany();

        // ── 4. Users / Viewers / Generic accounts ────────────────────
        const userResults = await this.userRepository
            .createQueryBuilder('user')
            .select([
                'user.id',
                'user.fullName',
                'user.email',
                'user.avatarUrl',
                'user.role',
                'user.company',
                'user.bio',
                'user.location',
            ])
            .where('user.fullName ILIKE :q', { q })
            .orWhere('user.email ILIKE :q', { q })
            .orWhere('user.company ILIKE :q', { q })
            .orWhere('user.bio ILIKE :q', { q })
            .andWhere('user.deletedAt IS NULL')
            .take(20)
            .getMany();

        // ── 5. Reels / Pitch Reels by hashtag, title, description ────
        const reelResults = await this.reelRepository
            .createQueryBuilder('reel')
            .leftJoinAndSelect('reel.startup', 'startup')
            .leftJoinAndSelect('startup.founder', 'founder')
            .where(
                `(reel.title ILIKE :q OR reel.description ILIKE :q OR reel.hashtags @> ARRAY[:tag]::text[] OR EXISTS (SELECT 1 FROM unnest(reel.hashtags) h WHERE h ILIKE :q))`,
                { q, tag: cleanQuery },
            )
            .andWhere('reel.deletedAt IS NULL')
            .orderBy('reel.likeCount', 'DESC')
            .take(30)
            .getMany();

        // Deduplicate reels
        const reelMap = new Map<string, any>();
        reelResults.forEach(r => reelMap.set(r.id, r));
        const dedupedReels = Array.from(reelMap.values());

        // Collect hashtags from matching reels
        const matchingHashtags = [...new Set(
            dedupedReels
                .flatMap(r => r.hashtags || [])
                .filter(h => h.toLowerCase().includes(cleanQuery)),
        )].slice(0, 20);

        const results = {
            users: userResults,
            startups: startupResults,
            investors: investorResults,
            incubators: incubatorResults,
            reels: dedupedReels,
            hashtags: matchingHashtags,
        };

        // Cache 5 minutes
        await this.cacheSet(cacheKey, results, 300);

        return results;
    }

    async getTrendingHashtags() {
        const cacheKey = 'trending:hashtags';
        const cached = await this.cacheGet(cacheKey);
        if (cached) return cached;

        const hashtags = await this.hashtagRepository.find({
            order: { usageCount: 'DESC' },
            take: 20,
        });

        await this.cacheSet(cacheKey, hashtags, 900);
        return hashtags;
    }

    async getTopStartups() {
        const cacheKey = 'top:startups';
        const cached = await this.cacheGet(cacheKey);
        if (cached) return cached;

        const startups = await this.startupRepository.find({
            relations: ['founder', 'reels'],
            order: { followerCount: 'DESC' },
            take: 20,
        });

        await this.cacheSet(cacheKey, startups, 1800);
        return startups;
    }

    async getStartupsOfTheWeek() {
        const cacheKey = 'startups:week';
        const cached = await this.cacheGet(cacheKey);
        if (cached) return cached;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const startups = await this.startupRepository
            .createQueryBuilder('startup')
            .leftJoinAndSelect('startup.founder', 'founder')
            .leftJoinAndSelect('startup.reels', 'reels')
            .where('startup.createdAt >= :date', { date: oneWeekAgo })
            .andWhere('startup.deletedAt IS NULL')
            .orderBy('startup.followerCount', 'DESC')
            .take(10)
            .getMany();

        await this.cacheSet(cacheKey, startups, 3600);
        return startups;
    }

    async getInvestorSpotlight() {
        const cacheKey = 'investors:spotlight';
        const cached = await this.cacheGet(cacheKey);
        if (cached) return cached;

        const investors = await this.userRepository.find({
            where: { role: In([UserRole.INVESTOR, UserRole.INCUBATOR]) },
            take: 10,
        });

        await this.cacheSet(cacheKey, investors, 3600);
        return investors;
    }

    async getLiveBattleground() {
        const cacheKey = 'battleground:live';
        const cached = await this.cacheGet(cacheKey);
        if (cached) return cached;

        const reels = await this.reelRepository.find({
            where: { isFeatured: true },
            relations: ['startup', 'startup.founder'],
            order: { likeCount: 'DESC' },
            take: 10,
        });

        await this.cacheSet(cacheKey, reels, 300);
        return reels;
    }
}
