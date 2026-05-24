import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { Startup } from './startup.entity';
import { User } from '../../users/entities/user.entity';

@Entity('startup_profile_visits')
@Unique(['startupId', 'visitorId', 'visitDate'])
export class StartupProfileVisit {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'startup_id' })
    @Index()
    startupId: string;

    @Column({ name: 'visitor_id' })
    @Index()
    visitorId: string;

    @Column({ name: 'visit_date', type: 'date' })
    visitDate: string;

    @ManyToOne(() => Startup, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'startup_id' })
    startup: Startup;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'visitor_id' })
    visitor: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
