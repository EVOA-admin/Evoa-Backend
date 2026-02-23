import { Controller, Get, Post, Patch, Delete, Param, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StartupsService } from './startups.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateStartupDto } from './dto/create-startup.dto';

@ApiTags('Startups')
@Controller('startups')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class StartupsController {
    constructor(private readonly startupsService: StartupsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a startup profile' })
    @ApiResponse({ status: 201, description: 'Startup created successfully' })
    @ApiResponse({ status: 409, description: 'Username already taken' })
    async createStartup(@CurrentUser() user: User, @Body() dto: CreateStartupDto) {
        return this.startupsService.createStartup(user.id, dto);
    }

    @Get('my')
    @ApiOperation({ summary: 'Get current founder\'s startup' })
    @ApiResponse({ status: 200, description: 'My startup retrieved' })
    async getMyStartup(@CurrentUser() user: User) {
        return this.startupsService.getMyStartup(user.id);
    }

    @Post('my/publish-reel')
    @ApiOperation({ summary: 'Publish or re-publish pitch video as a Reel' })
    @ApiResponse({ status: 201, description: 'Pitch reel published/updated' })
    async publishPitchReel(@CurrentUser() user: User) {
        return this.startupsService.publishPitchReel(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get startup details' })
    @ApiResponse({ status: 200, description: 'Startup retrieved successfully' })
    async getStartup(@Param('id') startupId: string) {
        return this.startupsService.getStartup(startupId);
    }

    @Get(':id/follow-status')
    @ApiOperation({ summary: 'Check if current user follows a startup' })
    async getFollowStatus(@Param('id') startupId: string, @CurrentUser() user: User) {
        return this.startupsService.getFollowStatus(startupId, user.id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update startup (founder only)' })
    @ApiResponse({ status: 200, description: 'Startup updated successfully' })
    async updateStartup(@Param('id') startupId: string, @CurrentUser() user: User, @Body() dto: any) {
        return this.startupsService.updateStartup(user.id, startupId, dto);
    }

    @Post(':id/follow')
    @ApiOperation({ summary: 'Follow a startup' })
    @ApiResponse({ status: 201, description: 'Startup followed successfully' })
    @ApiResponse({ status: 409, description: 'Already following' })
    async followStartup(@Param('id') startupId: string, @CurrentUser() user: User) {
        return this.startupsService.followStartup(startupId, user.id);
    }

    @Delete(':id/follow')
    @ApiOperation({ summary: 'Unfollow a startup' })
    @ApiResponse({ status: 200, description: 'Startup unfollowed successfully' })
    async unfollowStartup(@Param('id') startupId: string, @CurrentUser() user: User) {
        return this.startupsService.unfollowStartup(startupId, user.id);
    }

    @Get('following/me')
    @ApiOperation({ summary: 'Get followed startups' })
    @ApiResponse({ status: 200, description: 'Followed startups retrieved' })
    async getFollowedStartups(@CurrentUser() user: User) {
        return this.startupsService.getUserFollowedStartups(user.id);
    }
}
