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
        const updatePayload: Partial<User> = {};
        if (dto.fullName !== undefined) updatePayload.fullName = dto.fullName;
        if (dto.bio !== undefined) updatePayload.bio = dto.bio;
        if (dto.company !== undefined) updatePayload.company = dto.company;
        if (dto.location !== undefined) updatePayload.location = dto.location;
        if (dto.website !== undefined) updatePayload.website = dto.website;
        if (dto.avatarUrl !== undefined) updatePayload.avatarUrl = dto.avatarUrl;

        if (Object.keys(updatePayload).length === 0) {
            return this.userRepository.findOne({ where: { id: userId } });
        }

        try {
            await this.userRepository.update({ id: userId }, updatePayload);
        } catch (err) {
            console.error('[UsersService] updateProfile DB error:', err?.message || err);
            throw err;
        }
        return this.userRepository.findOne({ where: { id: userId } });
    }

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

    async completeRegistration(userId: string) {
        await this.userRepository.update({ id: userId }, { registrationCompleted: true });
        return this.userRepository.findOne({ where: { id: userId } });
    }

    /** Check whether connectorId follows targetId */
    async getConnectionStatus(targetUserId: string, connectorId: string) {
        if (targetUserId === connectorId) {
            return { connected: false, isFollowing: false, followerCount: 0, isOwnProfile: true };
        }

        const [connection, target] = await Promise.all([
            this.connectionRepository.findOne({
                where: { connectorId, targetId: targetUserId }
            }),
            this.userRepository.findOne({
                where: { id: targetUserId },
                select: ['id', 'connectionCount', 'role'],
            }),
        ]);

        const isFollowing = !!connection;
        return {
            connected: isFollowing,
            isFollowing,
            followerCount: target?.connectionCount ?? 0,
        };
    }

    /** Alias for getConnectionStatus */
    async getFollowStatus(targetUserId: string, followerId: string) {
        return this.getConnectionStatus(targetUserId, followerId);
    }

    /**
     * Toggle follow / unfollow.
     * Startups cannot be followed — they receive "Support" via /startups/:id/follow.
     */
    async toggleConnect(targetUserId: string, connectorId: string) {
        if (targetUserId === connectorId) {
            return { message: 'Cannot follow yourself', connected: false, isFollowing: false, followerCount: 0 };
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

        // Startups receive Support, not Follow
        if (target.role === UserRole.STARTUP) {
            throw new BadRequestException('Startups cannot be followed. Use the Support feature instead.');
        }

        const existing = await this.connectionRepository.findOne({
            where: { connectorId, targetId: targetUserId },
        });

        if (existing) {
            // — Unfollow —
            await this.connectionRepository.remove(existing);
            const newCount = Math.max(0, (target.connectionCount || 0) - 1);
            await this.userRepository.update({ id: targetUserId }, { connectionCount: newCount });
            return { connected: false, isFollowing: false, followerCount: newCount };
        }

        // — Follow —
        await this.connectionRepository.save({
            connectorId,
            targetId: targetUserId,
            connector: { id: connectorId } as any,
            target: { id: targetUserId } as any,
        });

        const newCount = (target.connectionCount || 0) + 1;
        await this.userRepository.update({ id: targetUserId }, { connectionCount: newCount });

        // Send "started following you" notification
        await this.notificationRepository.save(
            this.notificationRepository.create({
                userId: target.id,
                type: NotificationType.SYSTEM,
                title: 'New Follower 👋',
                message: `${connector.fullName || 'Someone'} started following you!`,
                link: `/u/${connector.id}`,
            }),
        ).catch(() => { /* ignore */ });

        return { connected: true, isFollowing: true, followerCount: newCount };
    }

    /** Alias for toggleConnect */
    async toggleFollow(targetUserId: string, followerId: string) {
        return this.toggleConnect(targetUserId, followerId);
    }

    /** List of users who follow the given user */
    async getFollowers(userId: string) {
        const connections = await this.connectionRepository.find({
            where: { targetId: userId },
            relations: ['connector'],
            order: { createdAt: 'DESC' },
        });
        return connections.map(c => ({
            id: c.connector?.id,
            fullName: c.connector?.fullName,
            avatarUrl: c.connector?.avatarUrl,
            role: c.connector?.role,
        }));
    }

    /** List of users that userId is following */
    async getFollowing(userId: string) {
        const connections = await this.connectionRepository.find({
            where: { connectorId: userId },
            relations: ['target'],
            order: { createdAt: 'DESC' },
        });
        return connections.map(c => ({
            id: c.target?.id,
            fullName: c.target?.fullName,
            avatarUrl: c.target?.avatarUrl,
            role: c.target?.role,
        }));
    }

    /** @deprecated — kept for backward compat */
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
