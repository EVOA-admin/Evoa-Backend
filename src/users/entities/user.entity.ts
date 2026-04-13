import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany, Index } from 'typeorm';
import { Startup } from '../../startups/entities/startup.entity';
import { ReelLike } from '../../reels/entities/reel-like.entity';
import { ReelComment } from '../../reels/entities/reel-comment.entity';
import { ReelShare } from '../../reels/entities/reel-share.entity';
import { ReelSave } from '../../reels/entities/reel-save.entity';
import { ReelView } from '../../reels/entities/reel-view.entity';
import { Follow } from '../../startups/entities/follow.entity';
import { Meeting } from '../../meetings/entities/meeting.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { InvestorAiLog } from '../../ai/entities/investor-ai-log.entity';
import { Investor } from '../../investors/entities/investor.entity';
import { Incubator } from '../../incubators/entities/incubator.entity';
import { UserConnection } from './user-connection.entity';
import { Referral } from '../../ambassador/entities/referral.entity';

export enum UserRole {
    VIEWER = 'viewer',
    STARTUP = 'startup',
    INVESTOR = 'investor',
    INCUBATOR = 'incubator',
    ADMIN = 'admin',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    email: string;

    @Column({ name: 'password_hash', nullable: true })
    passwordHash: string;

    @Column({ name: 'full_name' })
    fullName: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.VIEWER,
    })
    @Index()
    role: UserRole;

    @Column({ name: 'role_selected', default: false })
    roleSelected: boolean;

    @Column({ name: 'registration_completed', default: false })
    registrationCompleted: boolean;

    // Backward-compat alias — true when both flags are set
    get onboardingCompleted(): boolean {
        return this.roleSelected && this.registrationCompleted;
    }

    @Column({ name: 'avatar_url', nullable: true })
    avatarUrl: string;

    @Column({ type: 'text', nullable: true })
    bio: string;

    @Column({ nullable: true })
    company: string;

    @Column({ nullable: true })
    location: string;

    @Column({ nullable: true })
    website: string;

    @Column({ name: 'connection_count', default: 0 })
    connectionCount: number;

    @Column({ name: 'referral_code', unique: true, nullable: true, length: 16 })
    referralCode: string;

    @Column({ name: 'supabase_user_id', unique: true, nullable: true })
    @Index()
    supabaseUserId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;

    // Relations
    @OneToMany(() => Startup, (startup) => startup.founder)
    startups: Startup[];

    @OneToMany(() => ReelLike, (like) => like.user)
    reelLikes: ReelLike[];

    @OneToMany(() => ReelComment, (comment) => comment.user)
    reelComments: ReelComment[];

    @OneToMany(() => ReelShare, (share) => share.user)
    reelShares: ReelShare[];

    @OneToMany(() => ReelSave, (save) => save.user)
    reelSaves: ReelSave[];

    @OneToMany(() => ReelView, (view) => view.user)
    reelViews: ReelView[];

    @OneToMany(() => Follow, (follow) => follow.follower)
    follows: Follow[];

    @OneToMany(() => Meeting, (meeting) => meeting.investor)
    investorMeetings: Meeting[];

    @OneToMany(() => Meeting, (meeting) => meeting.founder)
    founderMeetings: Meeting[];

    @OneToMany(() => Notification, (notification) => notification.user)
    notifications: Notification[];

    @OneToMany(() => InvestorAiLog, (log) => log.investor)
    aiLogs: InvestorAiLog[];

    @OneToMany(() => Investor, (investor) => investor.user)
    investors: Investor[];

    @OneToMany(() => Incubator, (incubator) => incubator.user)
    incubators: Incubator[];

    @OneToMany(() => UserConnection, (conn) => conn.connector)
    connectionsGiven: UserConnection[];

    @OneToMany(() => UserConnection, (conn) => conn.target)
    connectionsReceived: UserConnection[];

    @OneToMany(() => Referral, (ref) => ref.referrer)
    referralsMade: Referral[];
}
