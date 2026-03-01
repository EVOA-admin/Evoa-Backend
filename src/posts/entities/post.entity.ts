import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
    ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('posts')
export class Post {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    /** Populated only when the post author is a startup — links post → startup for stats enrichment */
    @Column({ name: 'startup_id', nullable: true })
    @Index()
    startupId: string;

    @Column({ name: 'image_url', nullable: true })
    imageUrl: string;

    @Column({ type: 'text', nullable: true })
    caption: string;

    @Column({ type: 'text', array: true, default: '{}' })
    hashtags: string[];

    @Column({ name: 'like_count', default: 0 })
    likeCount: number;

    @Column({ name: 'comment_count', default: 0 })
    commentCount: number;

    @Column({ name: 'share_count', default: 0 })
    shareCount: number;

    /** Denormalized count of unique website clicks — incremented when a user clicks the link for the first time */
    @Column({ name: 'click_through_count', default: 0 })
    clickThroughCount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;
}
