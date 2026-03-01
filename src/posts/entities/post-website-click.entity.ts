import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { Post } from './post.entity';
import { User } from '../../users/entities/user.entity';

/** Tracks unique per-user clicks on the startup website link in a post */
@Entity('post_website_clicks')
@Unique(['postId', 'userId'])
export class PostWebsiteClick {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'post_id' })
    @Index()
    postId: string;

    @ManyToOne(() => Post, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'post_id' })
    post: Post;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
