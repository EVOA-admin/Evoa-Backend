import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Startup } from '../../startups/entities/startup.entity';

export enum MeetingStatus {
    SCHEDULED = 'scheduled',
    ONGOING = 'ongoing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    // Legacy statuses kept for backwards-compat
    REQUESTED = 'requested',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
}

@Entity('meetings')
export class Meeting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'investor_id' })
    @Index()
    investorId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'investor_id' })
    investor: User;

    @Column({ name: 'startup_id' })
    @Index()
    startupId: string;

    @ManyToOne(() => Startup, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'startup_id' })
    startup: Startup;

    @Column({ name: 'founder_id' })
    @Index()
    founderId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'founder_id' })
    founder: User;

    @Column({
        type: 'enum',
        enum: MeetingStatus,
        default: MeetingStatus.SCHEDULED,
    })
    @Index()
    status: MeetingStatus;

    @Column({ name: 'meeting_link', nullable: true })
    meetingLink: string;

    /** Jitsi room identifier — used to construct the video call URL on the frontend */
    @Column({ name: 'video_room_id', nullable: true })
    videoRoomId: string;

    /** The chat conversation where the meeting card was posted */
    @Column({ name: 'conversation_id', nullable: true })
    conversationId: string;

    @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
    scheduledAt: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
