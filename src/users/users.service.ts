import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async getProfile(userId: string) {
        return this.userRepository.findOne({
            where: { id: userId },
            relations: ['startups']
        });
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        await this.userRepository.update({ id: userId }, dto);
        return this.userRepository.findOne({ where: { id: userId } });
    }

    async updateRole(userId: string, role: string) {
        const validRoles = Object.values(UserRole);
        if (!validRoles.includes(role as UserRole)) {
            throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }
        await this.userRepository.update({ id: userId }, { role: role as UserRole });
        return this.userRepository.findOne({ where: { id: userId } });
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

        // If still not found, create new user
        if (!user) {
            user = this.userRepository.create({
                email,
                supabaseUserId: id,
                fullName: user_metadata?.full_name || user_metadata?.name || email?.split('@')[0] || '',
                avatarUrl: user_metadata?.avatar_url || '',
                role: UserRole.VIEWER,
            });
            await this.userRepository.save(user);
        }

        return user;
    }
}
