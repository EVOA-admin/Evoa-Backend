import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { User } from '../users/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
    ],
    providers: [SupabaseAuthGuard],
    exports: [SupabaseAuthGuard, TypeOrmModule],
})
export class AuthGuardModule { }
