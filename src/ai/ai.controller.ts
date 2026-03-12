import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AskStartupDto {
    @IsString()
    @IsNotEmpty()
    startupId: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    question: string;
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class AiController {
    constructor(private readonly aiService: AiService) { }

    /**
     * POST /ai/ask
     * Investor / Incubator asks a question about a specific startup.
     * Returns { answer, source, canAskFounder }.
     */
    @Post('ask')
    @UseGuards(RolesGuard)
    @Roles(UserRole.INVESTOR, UserRole.INCUBATOR, UserRole.ADMIN)
    @ApiOperation({ summary: 'Ask the AI a question about a specific startup pitch (Investor/Incubator only)' })
    async ask(
        @CurrentUser() user: User,
        @Body() dto: AskStartupDto,
    ) {
        return this.aiService.analyzeStartup(dto.startupId, user.id, dto.question);
    }
}
