import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { PricingOrder } from './entities/pricing-order.entity';
import { User, UserPlanType, UserRole, SubscriptionStatus } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';

type PricingPayload = {
    startups: any;
    investors: any;
    ambassador: any;
};

@Injectable()
export class PricingService {
    constructor(
        @InjectRepository(PricingOrder)
        private readonly pricingOrderRepository: Repository<PricingOrder>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    getPricing(): PricingPayload {
        return {
            startups: {
                title: 'For Startups',
                description: 'Turn your ideas into opportunities. Pitch, grow, and get discovered.',
                features: [
                    'Pitch your startup using reels',
                    'Access investor insights',
                    'Engagement analytics (basic)',
                    'Build visibility',
                ],
                freePlan: {
                    price: '₹0/month',
                    cta: 'Get Started',
                },
                proPlan: {
                    price: '₹999/month',
                    cta: 'Upgrade to Pro',
                    features: [
                        'upload more than one pitch videos',
                        'Priority visibility to investors',
                        'Featured placement in feeds',
                        'Access to premium investor network',
                    ],
                },
            },
            investors: {
                title: 'For Investors 💼',
                description: 'Discover the next big thing before everyone else.',
                features: [
                    'Get advanced analytics',
                    'Get recomendations and analysis with Investor AI.',
                    'Discover curated pitches',
                    'Save and track startup',
                ],
                freePlan: {
                    price: 'Free Browsing (limited access)',
                    cta: 'Explore Startups',
                },
                premiumPlan: {
                    price: '₹4999/month',
                    cta: 'Go Premium',
                    features: [
                        'Full access to all startup data',
                        'Direct messaging with founders',
                        'Early access to top startups',
                        'Investor analytics dashboard',
                    ],
                },
            },
            ambassador: {
                title: 'Ambassador Program 🌟',
                description: 'Be the voice of Evoa. Grow with us and earn along the way.',
                features: [
                    'Represent Evoa in your network',
                    'Earn money on successful referrals',
                ],
                price: 'Free to join',
                benefits: [
                    'Incentives per referral',
                    'Exclusive community access',
                    'Recognition & leaderboard',
                ],
                cta: 'Join Program',
            },
        };
    }

    async createOrder(user: User, dto: CreateOrderDto) {
        const plans = {
            startup: {
                amountPaise: 99900,
                role: UserRole.STARTUP,
                planType: UserPlanType.STARTUP,
                name: 'Startup Pro Subscription',
            },
            investor: {
                amountPaise: 499900,
                role: UserRole.INVESTOR,
                planType: UserPlanType.INVESTOR,
                name: 'Investor Premium Subscription',
            },
        } as const;

        const plan = plans[dto.planType];
        if (!plan) {
            throw new BadRequestException('Unsupported plan type.');
        }

        if (user.role !== plan.role) {
            throw new ForbiddenException(`Only ${plan.role} users can create an order for this plan.`);
        }

        const paymentId = `pay_${randomUUID().replace(/-/g, '').slice(0, 18)}`;

        const order = this.pricingOrderRepository.create({
            userId: user.id,
            planType: plan.planType,
            paymentId,
            amountPaise: plan.amountPaise,
            currency: 'INR',
            subscriptionStatus: SubscriptionStatus.PENDING,
        });

        await this.pricingOrderRepository.save(order);

        await this.userRepository.update(
            { id: user.id },
            {
                planType: plan.planType,
                subscriptionStatus: SubscriptionStatus.PENDING,
                subscriptionStartDate: null,
                subscriptionEndDate: null,
            },
        );

        return {
            paymentId,
            planType: dto.planType,
            amount: plan.amountPaise,
            currency: 'INR',
            subscriptionStatus: SubscriptionStatus.PENDING,
            razorpayKey: process.env.RAZORPAY_KEY_ID || null,
            planName: plan.name,
            note: 'Razorpay order creation is prepared. Use this payload to complete the client-side checkout flow.',
        };
    }
}
