import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Startup } from '../../startups/entities/startup.entity';
import { User } from '../../users/entities/user.entity';

@Entity('investor_ai_logs')
export class InvestorAiLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'startup_id' })
    @Index()
    startupId: string;

    @ManyToOne(() => Startup, (startup) => startup.aiLogs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'startup_id' })
    startup: Startup;

    @Column({ name: 'investor_id' })
    @Index()
    investorId: string;

    @ManyToOne(() => User, (user) => user.aiLogs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'investor_id' })
    investor: User;

    @Column({ name: 'action_type', nullable: true })
    actionType: string;

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    metadata: any;

    @Column({ name: 'ai_response', type: 'jsonb' })
    aiResponse: any;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
