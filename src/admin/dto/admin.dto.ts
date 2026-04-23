import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class AdminUsersQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: UserRole })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ enum: ['free', 'premium'] })
    @IsOptional()
    @IsString()
    plan?: 'free' | 'premium';

    @ApiPropertyOptional({ enum: ['active', 'pending', 'inactive'] })
    @IsOptional()
    @IsString()
    status?: 'active' | 'pending' | 'inactive';
}

export class UpdateAdminUserDto {
    @ApiPropertyOptional({ enum: UserRole })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isPremium?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isLegacyUser?: boolean;
}

export class AdminStartupsQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: ['all', 'premium', 'free'] })
    @IsOptional()
    @IsString()
    plan?: 'all' | 'premium' | 'free';

    @ApiPropertyOptional({ enum: ['all', 'participating', 'not_participating'] })
    @IsOptional()
    @IsString()
    battleground?: 'all' | 'participating' | 'not_participating';
}

export class UpdateAdminStartupDto {
    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    forcePremium?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    selectedBattlegroundReelId?: string | null;
}

export class AdminInvestorsQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: ['all', 'premium', 'free'] })
    @IsOptional()
    @IsString()
    plan?: 'all' | 'premium' | 'free';

    @ApiPropertyOptional({ enum: ['all', 'legacy', 'non_legacy'] })
    @IsOptional()
    @IsString()
    legacy?: 'all' | 'legacy' | 'non_legacy';

    @ApiPropertyOptional({ enum: ['all', 'pending', 'active', 'free'] })
    @IsOptional()
    @IsString()
    paymentStatus?: 'all' | 'pending' | 'active' | 'free';
}

export class UpdateAdminInvestorDto {
    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    grantPremium?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isLegacyUser?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    resetPaymentStatus?: boolean;
}

export class AddBattlegroundStartupDto {
    @ApiPropertyOptional()
    @IsString()
    startupId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reelId?: string;
}

export class UpdateBattlegroundRegistrationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    selectedReelId?: string | null;
}

export class DeclareBattlegroundWinnerDto {
    @ApiPropertyOptional()
    @IsString()
    startupId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reelId?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    prizeTitle?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    prizeDescription?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    prizeAmount?: string;
}
