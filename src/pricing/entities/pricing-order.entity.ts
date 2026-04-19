import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User, SubscriptionStatus, UserPlanType } from '../../users/entities/user.entity';

@Entity('pricing_orders')
export class PricingOrder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        name: 'plan_type',
        type: 'enum',
        enum: UserPlanType,
    })
    planType: UserPlanType;

    @Column({ name: 'payment_id', unique: true })
    @Index()
    paymentId: string;

    @Column({ name: 'amount_paise', type: 'integer' })
    amountPaise: number;

    @Column({ length: 3, default: 'INR' })
    currency: string;

    @Column({
        name: 'subscription_status',
        type: 'enum',
        enum: SubscriptionStatus,
        default: SubscriptionStatus.PENDING,
    })
    subscriptionStatus: SubscriptionStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
