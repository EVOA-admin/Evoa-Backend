import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, JoinColumn, ManyToOne, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('incubators')
export class Incubator {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column('text', { array: true, default: '{}' })
    programTypes: string[]; // Accelerator, Incubator, Coworking, etc.

    @Column({ nullable: true })
    tagline: string;

    @Column({ name: 'official_email', nullable: true })
    officialEmail: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    website: string;

    @Column({ name: 'logo_url', nullable: true })
    logoUrl: string;

    @Column('text', { array: true, default: '{}' })
    sectors: string[];

    @Column('text', { array: true, default: '{}' })
    stages: string[];

    @Column({ type: 'jsonb', nullable: true })
    location: { city: string; state: string; country: string };

    @Column({ name: 'application_deadline', nullable: true })
    applicationDeadline: Date;

    @Column({ name: 'cohort_size', nullable: true })
    cohortSize: number;

    @Column('text', { array: true, default: '{}' })
    facilities: string[];

    @Column('text', { array: true, default: '{}' })
    gallery: string[];

    @Column({ type: 'jsonb', nullable: true, default: '{}' })
    socialLinks: {
        linkedin?: string;
        instagram?: string;
        youtube?: string;
        twitter?: string;
    };

    @Column({ type: 'jsonb', nullable: true, default: '{}' })
    stats: {
        startupsIncubated: number;
        fundsRaised: string;
        mentorsCount: number;
    };

    @Column({ default: false })
    verified: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
