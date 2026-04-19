import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Startup } from '../../startups/entities/startup.entity';

export enum BattlegroundPaymentStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
}

@Entity('battleground_registrations')
export class BattlegroundRegistration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'startup_id' })
    @Index()
    startupId: string;

    @ManyToOne(() => Startup, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'startup_id' })
    startup: Startup;

    @Column({ name: 'razorpay_order_id', type: 'varchar', length: 255, unique: true })
    @Index()
    razorpayOrderId: string;

    @Column({ name: 'payment_id', type: 'varchar', length: 255, unique: true, nullable: true })
    @Index()
    paymentId: string | null;

    @Column({ name: 'amount_paise', type: 'integer' })
    amountPaise: number;

    @Column({ length: 3, default: 'INR' })
    currency: string;

    @Column({ name: 'payment_status', type: 'varchar', length: 20, default: BattlegroundPaymentStatus.PENDING })
    @Index()
    paymentStatus: BattlegroundPaymentStatus;

    @Column({ name: 'provider_signature', type: 'varchar', length: 255, nullable: true })
    providerSignature: string | null;

    @Column({ name: 'failure_reason', type: 'text', nullable: true })
    failureReason: string | null;

    @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
    verifiedAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
