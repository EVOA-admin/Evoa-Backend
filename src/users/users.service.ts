import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UserConnection } from './entities/user-connection.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
import { UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
        @InjectRepository(UserConnection)
        private readonly connectionRepository: Repository<UserConnection>,
    ) { }

    async getProfile(userId: string) {
        return this.userRepository.findOne({
            where: { id: userId },
            relations: ['startups'],
        });
    }

    async getPublicProfile(userId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: [
                'startups',
                'startups.reels',
                'investors',
                'incubators',
            ],
        });
        if (!user) throw new Error('User not found');
        return user;
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        await this.userRepository.update({ id: userId }, dto);
        return this.userRepository.findOne({ where: { id: userId } });
    }

    /**
     * Step 1 of onboarding: user picks a role.
     */
    async updateRole(userId: string, role: string) {
        const validRoles = Object.values(UserRole);
        if (!validRoles.includes(role as UserRole)) {
            throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }

        const isViewer = role === UserRole.VIEWER;
        await this.userRepository.update(
            { id: userId },
            {
                role: role as UserRole,
                roleSelected: true,
                registrationCompleted: isViewer,
            }
        );
        return this.userRepository.findOne({ where: { id: userId } });
    }

    /**
     * Step 2 of onboarding: user completes the role-specific registration form.
     */
    async completeRegistration(userId: string) {
        await this.userRepository.update({ id: userId }, { registrationCompleted: true });
        return this.userRepository.findOne({ where: { id: userId } });
    }

    /**
     * Get whether connectorId has connected with targetId.
     */
    async getConnectionStatus(targetUserId: string, connectorId: string) {
        if (targetUserId === connectorId) {
            return { connected: false, connectionCount: 0, isOwnProfile: true };
        }

        const [connection, target] = await Promise.all([
            this.connectionRepository.findOne({
                where: { connectorId, targetId: targetUserId },
            }),
            this.userRepository.findOne({
                where: { id: targetUserId },
                select: ['id', 'connectionCount'],
            }),
        ]);

        return {
            connected: !!connection,
            connectionCount: target?.connectionCount ?? 0,
        };
    }

    /**
     * Toggle connect/disconnect.
     * - First click  → creates connection row, increments connectionCount, sends notification.
     * - Second click → removes connection row, decrements connectionCount.
     * Returns { connected, connectionCount }.
     */
    async toggleConnect(targetUserId: string, connectorId: string) {
        if (targetUserId === connectorId) {
            return { message: 'Cannot connect with yourself', connected: false, connectionCount: 0 };
        }

        const [target, connector] = await Promise.all([
            this.userRepository.findOne({
                where: { id: targetUserId },
                select: ['id', 'role', 'fullName', 'connectionCount'],
            }),
            this.userRepository.findOne({
                where: { id: connectorId },
                select: ['id', 'fullName', 'avatarUrl'],
            }),
        ]);

        if (!target || !connector) {
            throw new BadRequestException('User not found');
        }

        const existing = await this.connectionRepository.findOne({
            where: { connectorId, targetId: targetUserId },
        });

        if (existing) {
            // — Disconnect —
            await this.connectionRepository.remove(existing);
            const newCount = Math.max(0, (target.connectionCount || 0) - 1);
            await this.userRepository.update({ id: targetUserId }, { connectionCount: newCount });
            return { connected: false, connectionCount: newCount };
        }

        // — Connect —
        await this.connectionRepository.save(
            this.connectionRepository.create({ connectorId, targetId: targetUserId }),
        );

        const newCount = (target.connectionCount || 0) + 1;
        await this.userRepository.update({ id: targetUserId }, { connectionCount: newCount });

        // Send notification to the target (investors & incubators only)
        if (target.role === UserRole.INVESTOR || target.role === UserRole.INCUBATOR) {
            await this.notificationRepository.save(
                this.notificationRepository.create({
                    userId: target.id,
                    type: NotificationType.SYSTEM,
                    title: 'New Connection 🤝',
                    message: `${connector.fullName || 'Someone'} connected with you!`,
                    link: `/u/${connector.id}`,
                }),
            );
        }

        return { connected: true, connectionCount: newCount };
    }

    /** @deprecated — kept for backward compat, now calls toggleConnect */
    async trackConnectClick(targetUserId: string, clickerId: string) {
        return this.toggleConnect(targetUserId, clickerId);
    }

    async syncUser(dto: any) {
        const { email, id, user_metadata } = dto;

        let user = await this.userRepository.findOne({ where: { supabaseUserId: id } });

        if (!user) {
            user = await this.userRepository.findOne({ where: { email } });
            if (user) {
                user.supabaseUserId = id;
                await this.userRepository.save(user);
            }
        }

        if (!user) {
            user = this.userRepository.create({
                email,
                supabaseUserId: id,
                fullName: user_metadata?.full_name || user_metadata?.name || email?.split('@')[0] || '',
                avatarUrl: user_metadata?.avatar_url || '',
                role: UserRole.VIEWER,
                roleSelected: false,
                registrationCompleted: false,
            });
            await this.userRepository.save(user);
        }

        return user;
    }
}
