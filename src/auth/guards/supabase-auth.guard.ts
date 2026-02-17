import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { supabaseClient } from '../../config/supabase.config';
import { User, UserRole } from '../../users/entities/user.entity';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No authentication token provided');
        }

        try {
            // Verify token with Supabase
            const { data, error } = await supabaseClient.auth.getUser(token);

            if (error || !data.user) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            // Find or create user in database
            let user = await this.userRepository.findOne({
                where: { supabaseUserId: data.user.id },
            });

            if (!user) {
                // Create user on first login
                user = this.userRepository.create({
                    email: data.user.email,
                    fullName: data.user.user_metadata?.full_name || data.user.email,
                    avatarUrl: data.user.user_metadata?.avatar_url,
                    supabaseUserId: data.user.id,
                    role: UserRole.VIEWER, // Default role
                });
                await this.userRepository.save(user);
            }

            // Attach user to request
            request.user = user;
            request.supabaseUser = data.user;

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Token validation failed');
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
