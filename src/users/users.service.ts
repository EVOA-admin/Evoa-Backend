import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
import { UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
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
            select: ['id', 'fullName', 'avatarUrl', 'role', 'bio', 'company', 'location', 'website', 'createdAt'],
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
     * Sets roleSelected=true. For viewer role, also sets registrationCompleted=true
     * since viewers don't have a registration form.
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
                // Viewers have no registration form, so mark complete immediately
                registrationCompleted: isViewer,
            }
        );
        return this.userRepository.findOne({ where: { id: userId } });
    }

    /**
     * Step 2 of onboarding: user completes the role-specific registration form.
     * Sets registrationCompleted=true.
     */
    async completeRegistration(userId: string) {
        await this.userRepository.update({ id: userId }, { registrationCompleted: true });
        return this.userRepository.findOne({ where: { id: userId } });
    }

    async trackConnectClick(targetUserId: string, clickerId: string) {
        if (targetUserId === clickerId) return { message: 'Cannot connect with self' };

        const [target, clicker] = await Promise.all([
            this.userRepository.findOne({ where: { id: targetUserId }, select: ['id', 'role'] }),
            this.userRepository.findOne({ where: { id: clickerId }, select: ['id', 'fullName'] })
        ]);

        if (!target || !clicker) return { message: 'User not found' };

        // We only notify Investors and Incubators about connections,
        // since Startups receive "Support" instead.
        if (target.role === UserRole.INVESTOR || target.role === UserRole.INCUBATOR) {
            await this.notificationRepository.save(
                this.notificationRepository.create({
                    userId: target.id,
                    type: NotificationType.SYSTEM,
                    title: 'New Connection Request 🤝',
                    message: `${clicker.fullName || 'Someone'} wants to connect with you!`,
                    link: `/u/${clicker.id}`,
                })
            );
        }

        return { message: 'Connect click tracked successfully' };
    }

    async syncUser(dto: any) {
        const { email, id, user_metadata } = dto;

        // Try to find by Supabase ID first
        let user = await this.userRepository.findOne({ where: { supabaseUserId: id } });

        // If not found, try by email (migration case)
        if (!user) {
            user = await this.userRepository.findOne({ where: { email } });

            if (user) {
                // Link existing user to Supabase ID
                user.supabaseUserId = id;
                await this.userRepository.save(user);
            }
        }

        // If still not found, create new user with default viewer role
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
