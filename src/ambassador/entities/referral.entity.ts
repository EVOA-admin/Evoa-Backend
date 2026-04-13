import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReferralStatus {
    PENDING  = 'pending',
    REWARDED = 'rewarded',
}

/**
 * Tracks which user referred which new user.
 * A user can only be referred once (unique constraint on referred_user_id).
 */
@Entity('referrals')
@Unique(['referredUserId']) // one user can only ever have one referrer
export class Referral {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'referrer_user_id' })
    @Index()
    referrerId: string;

    @Column({ name: 'referred_user_id' })
    referredUserId: string;

    @Column({
        type: 'enum',
        enum: ReferralStatus,
        default: ReferralStatus.PENDING,
    })
    status: ReferralStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations — optional (for JOIN queries)
    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'referrer_user_id' })
    referrer: User;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'referred_user_id' })
    referred: User;
}
