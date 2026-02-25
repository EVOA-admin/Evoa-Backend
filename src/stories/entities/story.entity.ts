import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('stories')
export class Story {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'media_url' })
    mediaUrl: string;

    /** Supabase storage path — used to delete the file later */
    @Column({ name: 'storage_path', nullable: true })
    storagePath: string;

    @Column({ name: 'like_count', default: 0 })
    likeCount: number;

    /** Stories expire 24 hours after creation */
    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
