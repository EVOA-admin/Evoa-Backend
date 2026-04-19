import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AmbassadorService {
    constructor(
        @InjectRepository(Referral)
        private readonly referralRepo: Repository<Referral>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) {}

    private normalizeCode(code: string): string {
        return typeof code === 'string' ? code.trim().toUpperCase() : '';
    }

    // ─── Code Generation ────────────────────────────────────────────────────

    /**
     * Generates a unique 16-character referral code.
     * Format: first 6 chars of email-username (uppercase, alphanum only) + 10 random A-Z0-9.
     */
    private generateCode(email: string): string {
        const prefix = email
            .split('@')[0]
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 6)
            .padEnd(6, 'X');                // ensure always 6 chars

        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous I/O/0/1
        let suffix = '';
        for (let i = 0; i < 10; i++) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return prefix + suffix;
    }

    /**
     * Returns the user's referral code, generating and persisting it if not yet set.
     * Retries up to 5 times on collision (astronomically unlikely but safe).
     */
    async getOrCreateCode(userId: string): Promise<string> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        if (user.referralCode) return user.referralCode;

        // Generate unique code with collision retry
        for (let attempt = 0; attempt < 5; attempt++) {
            const code = this.generateCode(user.email);
            const existing = await this.userRepo.findOne({ where: { referralCode: code } });
            if (!existing) {
                await this.userRepo.update({ id: userId }, { referralCode: code });
                return code;
            }
        }
        throw new ConflictException('Could not generate unique code. Please try again.');
    }

    // ─── Stats ───────────────────────────────────────────────────────────────

    /**
     * Returns full ambassador dashboard data for a user.
     */
    async getDashboard(userId: string) {
        const code = await this.getOrCreateCode(userId);

        const referrals = await this.referralRepo.find({
            where: { referrerId: userId },
            relations: ['referred'],
            order: { createdAt: 'DESC' },
        });

        return {
            code,
            totalReferrals: referrals.length,
            referrals: referrals.map(r => ({
                id:        r.referred?.id,
                fullName:  r.referred?.fullName || 'Evoa User',
                avatarUrl: r.referred?.avatarUrl || null,
                role:      r.referred?.role || 'viewer',
                status:    r.status,
                joinedAt:  r.createdAt,
            })),
        };
    }

    // ─── Validation ──────────────────────────────────────────────────────────

    /**
     * Validates a referral code. Returns { valid, referrerId }.
     * Safe to expose publicly (used on the signup page before auth).
     */
    async validateCode(code: string): Promise<{ valid: boolean; referrerId?: string }> {
        const normalizedCode = this.normalizeCode(code);
        if (!normalizedCode || normalizedCode.length !== 16) return { valid: false };

        const referrer = await this.userRepo.findOne({
            where: {
                referralCode: Raw((alias) => `UPPER(TRIM(${alias})) = :code`, { code: normalizedCode }),
            },
            select: ['id'],
        });

        if (!referrer) return { valid: false };
        return { valid: true, referrerId: referrer.id };
    }

    // ─── Apply Referral ───────────────────────────────────────────────────────

    /**
     * Links a new user to the referrer. Idempotent — silently ignores duplicates.
     * Called right after the new user's first login resolves.
     */
    async applyReferral(referralCode: string, newUserId: string): Promise<{ success: boolean; message: string }> {
        const normalizedCode = this.normalizeCode(referralCode);

        // Validate code
        const { valid, referrerId } = await this.validateCode(normalizedCode);
        if (!valid) throw new BadRequestException('Invalid referral code');

        // Prevent self-referral
        if (referrerId === newUserId) {
            throw new BadRequestException('You cannot use your own referral code');
        }

        // Idempotent: if already referred, just succeed silently
        const existing = await this.referralRepo.findOne({
            where: { referredUserId: newUserId },
        });
        if (existing) {
            return { success: true, message: 'Referral already recorded' };
        }

        // Persist the referral record
        await this.referralRepo.save(
            this.referralRepo.create({
                referrerId,
                referredUserId: newUserId,
                status: ReferralStatus.PENDING,
            }),
        );

        return { success: true, message: 'Referral applied successfully' };
    }
}
