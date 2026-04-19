import { ForbiddenException } from '@nestjs/common';
import { SubscriptionStatus, User, UserRole } from './entities/user.entity';

const hasUnexpiredSubscription = (user: User) => {
    if (!user.subscriptionEndDate) return false;
    return new Date(user.subscriptionEndDate).getTime() > Date.now();
};

export const hasActivePremiumAccess = (user: User | null | undefined) => {
    if (!user?.isPremium) return false;
    if (user.subscriptionStatus !== SubscriptionStatus.ACTIVE) return false;
    return hasUnexpiredSubscription(user);
};

export const isInvestorPaymentRequired = (user: User | null | undefined) => {
    if (!user || user.role !== UserRole.INVESTOR) return false;
    if (user.isLegacyUser) return false;
    return !hasActivePremiumAccess(user);
};

export const assertInvestorPaymentAccess = (user: User | null | undefined) => {
    if (isInvestorPaymentRequired(user)) {
        throw new ForbiddenException('Payment required');
    }
};
