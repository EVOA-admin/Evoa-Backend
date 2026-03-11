import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MessageRequestStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    IGNORED = 'ignored',
}

@Entity('message_requests')
export class MessageRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'from_user_id' })
    @Index()
    fromUserId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'from_user_id' })
    fromUser: User;

    @Column({ name: 'to_user_id' })
    @Index()
    toUserId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'to_user_id' })
    toUser: User;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({
        type: 'enum',
        enum: MessageRequestStatus,
        default: MessageRequestStatus.PENDING,
    })
    status: MessageRequestStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
