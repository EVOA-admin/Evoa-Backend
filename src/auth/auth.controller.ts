import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // NOTE: All auth endpoints removed - frontend now uses Supabase Auth directly
    // The following endpoints are no longer needed:
    // - POST /auth/signup (handled by Supabase)
    // - POST /auth/login (handled by Supabase)
    // - POST /auth/google (handled by Supabase)
    // - POST /auth/forgot-password (handled by Supabase)
    //
    // User synchronization happens via SupabaseAuthGuard on protected routes
}
