import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateProfileDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    company?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    website?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @ApiProperty({ required: false, enum: UserRole })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}

export class SyncUserDto {
    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    id: string; // Supabase User ID

    @ApiProperty({ required: false })
    @IsOptional()
    user_metadata?: any;
}

export class UpdateRoleDto {
    @ApiProperty({ enum: UserRole })
    @IsEnum(UserRole)
    role: UserRole;
}
