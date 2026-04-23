import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('battleground_admin_state')
export class BattlegroundAdminState {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'prize_title', default: 'Evoa Battleground Winner' })
    prizeTitle: string;

    @Column({ name: 'prize_description', type: 'text', nullable: true })
    prizeDescription: string | null;

    @Column({ name: 'prize_amount', default: 'To be announced' })
    prizeAmount: string;

    @Column({ name: 'winner_startup_id', type: 'uuid', nullable: true })
    winnerStartupId: string | null;

    @Column({ name: 'winner_reel_id', type: 'uuid', nullable: true })
    winnerReelId: string | null;

    @Column({ name: 'winner_declared_at', type: 'timestamptz', nullable: true })
    winnerDeclaredAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
