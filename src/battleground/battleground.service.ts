import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac } from 'crypto';
import { BattlegroundPaymentStatus, BattlegroundRegistration } from './entities/battleground-registration.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Startup } from '../startups/entities/startup.entity';
import { Reel } from '../reels/entities/reel.entity';
import { VerifyBattlegroundPaymentDto } from './dto/verify-battleground-payment.dto';
import { MarkBattlegroundPaymentFailedDto } from './dto/mark-battleground-payment-failed.dto';

type RazorpayOrderResponse = {
    id: string;
};

@Injectable()
export class BattlegroundService {
    private readonly amountPaise = 9900;
    private readonly currency = 'INR';

    constructor(
        @InjectRepository(BattlegroundRegistration)
        private readonly battlegroundRegistrationRepository: Repository<BattlegroundRegistration>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Startup)
        private readonly startupRepository: Repository<Startup>,
        @InjectRepository(Reel)
        private readonly reelRepository: Repository<Reel>,
    ) { }

    private get razorpayKeyId() {
        return (process.env.RAZORPAY_KEY_ID || '').trim();
    }

    private get razorpayKeySecret() {
        return (process.env.RAZORPAY_KEY_SECRET || '').trim();
    }

    private ensureRazorpayConfigured() {
        if (!this.razorpayKeyId || !this.razorpayKeySecret) {
            throw new InternalServerErrorException('Razorpay is not configured on the server.');
        }
    }

    private async getFreshUser(userId: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new ForbiddenException('User not found.');
        }
        return user;
    }

    private async getUserStartup(userId: string) {
        return this.startupRepository.findOne({
            where: { founderId: userId },
            relations: ['founder', 'reels'],
            order: {
                createdAt: 'DESC',
            },
        });
    }

    private async createRazorpayOrder(userId: string, startupId: string) {
        this.ensureRazorpayConfigured();

        let response: Response;
        try {
            response = await fetch('https://api.razorpay.com/v1/orders', {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${Buffer.from(`${this.razorpayKeyId}:${this.razorpayKeySecret}`).toString('base64')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: this.amountPaise,
                    currency: this.currency,
                    receipt: `battleground_${startupId.slice(0, 12)}_${Date.now()}`,
                    notes: {
                        userId,
                        startupId,
                        purpose: 'battleground_participation',
                    },
                }),
            });
        } catch {
            throw new BadGatewayException('Unable to reach Razorpay while creating the battleground order.');
        }

        const payload = await response.json().catch(() => ({} as { error?: { description?: string } }));
        if (!response.ok || !('id' in payload) || typeof payload.id !== 'string') {
            throw new BadRequestException(payload?.error?.description || 'Unable to create battleground payment order.');
        }

        return payload as RazorpayOrderResponse;
    }

    async getOverview(user: User) {
        const freshUser = await this.getFreshUser(user.id);
        const startup = freshUser.role === UserRole.STARTUP ? await this.getUserStartup(freshUser.id) : null;

        const registrations = await this.battlegroundRegistrationRepository.find({
            where: {
                paymentStatus: BattlegroundPaymentStatus.SUCCESS,
            },
            relations: ['startup', 'startup.founder'],
            order: { verifiedAt: 'DESC', createdAt: 'DESC' },
        });

        const startupIds = registrations.map((registration) => registration.startupId);
        const reels = startupIds.length
            ? await this.reelRepository.find({
                where: startupIds.map((startupId) => ({ startupId })),
                relations: ['startup'],
                order: { isFeatured: 'DESC', createdAt: 'DESC' },
            })
            : [];

        const reelMap = new Map<string, Reel>();
        reels.forEach((reel) => {
            if (!reelMap.has(reel.startupId)) {
                reelMap.set(reel.startupId, reel);
            }
        });

        const currentRegistration = startup
            ? await this.battlegroundRegistrationRepository.findOne({
                where: { startupId: startup.id },
                order: { createdAt: 'DESC' },
            })
            : null;

        return {
            participationFeePaise: this.amountPaise,
            participationFeeDisplay: '₹99',
            canParticipate: freshUser.role === UserRole.STARTUP && !!startup,
            alreadyParticipating: currentRegistration?.paymentStatus === BattlegroundPaymentStatus.SUCCESS,
            currentStatus: currentRegistration?.paymentStatus || null,
            registeredStartups: registrations.map((registration) => {
                const startupReel = reelMap.get(registration.startupId);
                return {
                    id: registration.id,
                    startupId: registration.startupId,
                    pitchId: startupReel?.id || null,
                    startupName: registration.startup?.name || 'Startup',
                    founderName:
                        registration.startup?.founders?.[0]?.name ||
                        registration.startup?.founder?.fullName ||
                        'Founder',
                    pitchTitle: startupReel?.title || registration.startup?.name || 'Startup Pitch',
                    pitchThumbnailUrl: startupReel?.thumbnailUrl || registration.startup?.logoUrl || null,
                    pitchVideoUrl: startupReel?.videoUrl || null,
                    verifiedAt: registration.verifiedAt,
                };
            }),
        };
    }

    async createOrder(user: User) {
        const freshUser = await this.getFreshUser(user.id);
        if (freshUser.role !== UserRole.STARTUP) {
            throw new ForbiddenException('Only startup accounts can participate in Battleground.');
        }

        const startup = await this.getUserStartup(freshUser.id);
        if (!startup) {
            throw new ForbiddenException('Complete your startup registration to participate in Battleground.');
        }

        const existingSuccessful = await this.battlegroundRegistrationRepository.findOne({
            where: {
                startupId: startup.id,
                paymentStatus: BattlegroundPaymentStatus.SUCCESS,
            },
            order: { verifiedAt: 'DESC', createdAt: 'DESC' },
        });

        if (existingSuccessful) {
            return {
                alreadyParticipating: true,
                message: 'This startup is already participating in Battleground.',
            };
        }

        const existingPending = await this.battlegroundRegistrationRepository.findOne({
            where: {
                startupId: startup.id,
                paymentStatus: BattlegroundPaymentStatus.PENDING,
            },
            order: { createdAt: 'DESC' },
        });

        if (existingPending?.razorpayOrderId) {
            return {
                orderId: existingPending.razorpayOrderId,
                amount: existingPending.amountPaise,
                currency: existingPending.currency,
                razorpayKey: this.razorpayKeyId,
                planName: 'Battleground Participation',
                paymentStatus: existingPending.paymentStatus,
                alreadyParticipating: false,
            };
        }

        const razorpayOrder = await this.createRazorpayOrder(freshUser.id, startup.id);
        const registration = this.battlegroundRegistrationRepository.create({
            userId: freshUser.id,
            startupId: startup.id,
            razorpayOrderId: razorpayOrder.id,
            paymentId: null,
            amountPaise: this.amountPaise,
            currency: this.currency,
            paymentStatus: BattlegroundPaymentStatus.PENDING,
            providerSignature: null,
            failureReason: null,
            verifiedAt: null,
        });

        await this.battlegroundRegistrationRepository.save(registration);

        return {
            orderId: registration.razorpayOrderId,
            amount: registration.amountPaise,
            currency: registration.currency,
            razorpayKey: this.razorpayKeyId,
            planName: 'Battleground Participation',
            paymentStatus: registration.paymentStatus,
            alreadyParticipating: false,
        };
    }

    async verifyPayment(user: User, dto: VerifyBattlegroundPaymentDto) {
        this.ensureRazorpayConfigured();
        const freshUser = await this.getFreshUser(user.id);
        if (freshUser.role !== UserRole.STARTUP) {
            throw new ForbiddenException('Only startup accounts can participate in Battleground.');
        }

        const startup = await this.getUserStartup(freshUser.id);
        if (!startup) {
            throw new ForbiddenException('Startup not found for this user.');
        }

        const registration = await this.battlegroundRegistrationRepository.findOne({
            where: {
                userId: freshUser.id,
                startupId: startup.id,
                razorpayOrderId: dto.razorpayOrderId,
            },
            order: { createdAt: 'DESC' },
        });

        if (!registration) {
            throw new BadRequestException('Battleground payment order not found.');
        }

        if (registration.paymentStatus === BattlegroundPaymentStatus.SUCCESS) {
            return {
                success: true,
                alreadyParticipating: true,
                message: 'You are already registered for Battleground.',
            };
        }

        const expectedSignature = createHmac('sha256', this.razorpayKeySecret)
            .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
            .digest('hex');

        if (expectedSignature !== dto.razorpaySignature) {
            await this.battlegroundRegistrationRepository.update(
                { id: registration.id },
                {
                    paymentStatus: BattlegroundPaymentStatus.FAILED,
                    failureReason: 'Payment signature verification failed.',
                },
            );
            throw new BadRequestException('Payment signature verification failed.');
        }

        await this.battlegroundRegistrationRepository.update(
            { id: registration.id },
            {
                paymentId: dto.razorpayPaymentId,
                providerSignature: dto.razorpaySignature,
                paymentStatus: BattlegroundPaymentStatus.SUCCESS,
                failureReason: null,
                verifiedAt: new Date(),
            },
        );

        return {
            success: true,
            alreadyParticipating: true,
            message: 'You are successfully registered for Battleground.',
        };
    }

    async markPaymentFailed(user: User, dto: MarkBattlegroundPaymentFailedDto) {
        const freshUser = await this.getFreshUser(user.id);
        const startup = freshUser.role === UserRole.STARTUP ? await this.getUserStartup(freshUser.id) : null;
        if (!startup) {
            return { success: true };
        }

        const registration = await this.battlegroundRegistrationRepository.findOne({
            where: {
                userId: freshUser.id,
                startupId: startup.id,
                razorpayOrderId: dto.razorpayOrderId,
            },
            order: { createdAt: 'DESC' },
        });

        if (!registration || registration.paymentStatus === BattlegroundPaymentStatus.SUCCESS) {
            return { success: true };
        }

        await this.battlegroundRegistrationRepository.update(
            { id: registration.id },
            {
                paymentStatus: BattlegroundPaymentStatus.FAILED,
                failureReason: dto.reason || 'Payment failed or was cancelled.',
            },
        );

        return { success: true };
    }
}
