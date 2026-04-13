import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AmbassadorService } from './ambassador.service';
import { ApplyReferralDto, ValidateReferralDto } from './dto/ambassador.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Ambassador')
@Controller('ambassador')
export class AmbassadorController {
    constructor(private readonly ambassadorService: AmbassadorService) {}

    /**
     * GET /ambassador/me
     * Returns the authenticated user's referral code + referral stats.
     * Generates a new code on first call (idempotent).
     */
    @Get('me')
    @UseGuards(SupabaseAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get ambassador dashboard: code + referral stats' })
    async getDashboard(@CurrentUser() user: User) {
        return this.ambassadorService.getDashboard(user.id);
    }

    /**
     * POST /ambassador/validate
     * Public endpoint — validates a referral code before signup.
     * No auth required so it can be called from the register page.
     */
    @Post('validate')
    @ApiOperation({ summary: 'Validate a referral code (public, no auth needed)' })
    async validateCode(@Body() dto: ValidateReferralDto) {
        return this.ambassadorService.validateCode(dto.referralCode);
    }

    /**
     * POST /ambassador/apply
     * Authenticated — links the new user to the referrer, called after first login.
     */
    @Post('apply')
    @UseGuards(SupabaseAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Apply a referral code for the current (newly signed-up) user' })
    async applyReferral(
        @CurrentUser() user: User,
        @Body() dto: ApplyReferralDto,
    ) {
        return this.ambassadorService.applyReferral(dto.referralCode, user.id);
    }
}
