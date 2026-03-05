import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getSupabaseAdmin } from '../../config/supabase.config';
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
            // Use service-role admin client — reliably verifies all Supabase JWTs
            // including Google OAuth tokens signed with ES256
            const adminClient = getSupabaseAdmin();
            const { data, error } = await adminClient.auth.getUser(token);

            if (error || !data.user) {
                console.error('[SupabaseAuthGuard] Token verification failed:', {
                    supabaseError: error?.message,
                    supabaseStatus: (error as any)?.status,
                    tokenPrefix: token.substring(0, 20) + '...',
                });
                throw new UnauthorizedException('Invalid or expired token');
            }

            // Find or link user in database
            const { id: supabaseUserId, email } = data.user;

            // 1. Try to find by Supabase ID
            let user = await this.userRepository.findOne({
                where: { supabaseUserId },
            });

            // 2. If not found by ID, try finding by email (for users previously registered or manually added)
            if (!user && email) {
                user = await this.userRepository.findOne({
                    where: { email },
                });

                if (user) {
                    // Link existing user record to new Supabase ID
                    user.supabaseUserId = supabaseUserId;
                    await this.userRepository.save(user);
                }
            }

            // 3. If still not found, create a new user record
            if (!user) {
                user = this.userRepository.create({
                    email,
                    fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || email?.split('@')[0] || '',
                    avatarUrl: data.user.user_metadata?.avatar_url,
                    supabaseUserId,
                    role: UserRole.VIEWER, // Default — overridden during /choice-role
                    onboardingCompleted: false,
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
            console.error('[SupabaseAuthGuard] Unexpected error:', error?.message || error);
            throw new UnauthorizedException('Token validation failed');
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
