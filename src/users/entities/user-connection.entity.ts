import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { User } from './user.entity';

/**
 * Tracks who has connected with whom.
 * connector  = the user who clicked Connect
 * target     = the investor/incubator they connected with
 * Unique constraint prevents double-connecting.
 */
@Entity('user_connections')
@Unique(['connectorId', 'targetId'])
export class UserConnection {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'connector_id' })
    @Index()
    connectorId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'connector_id' })
    connector: User;

    @Column({ name: 'target_id' })
    @Index()
    targetId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'target_id' })
    target: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
