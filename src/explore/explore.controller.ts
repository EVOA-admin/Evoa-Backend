import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExploreService } from './explore.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';

@ApiTags('Explore')
@Controller('explore')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ExploreController {
    constructor(private readonly exploreService: ExploreService) { }

    @Get('search')
    @ApiOperation({ summary: 'Search startups, investors, or hashtags' })
    @ApiQuery({ name: 'q', required: true })
    @ApiQuery({ name: 'type', enum: ['startups', 'investors', 'hashtags'], required: false })
    @ApiResponse({ status: 200, description: 'Search results retrieved' })
    async search(
        @Query('q') query: string,
        @Query('type') type: 'startups' | 'investors' | 'hashtags' = 'startups',
    ) {
        return this.exploreService.search(query, type);
    }

    @Get('hashtags/trending')
    @ApiOperation({ summary: 'Get trending hashtags' })
    @ApiResponse({ status: 200, description: 'Trending hashtags retrieved' })
    async getTrendingHashtags() {
        return this.exploreService.getTrendingHashtags();
    }

    @Get('startups/top')
    @ApiOperation({ summary: 'Get top performing startups' })
    @ApiResponse({ status: 200, description: 'Top startups retrieved' })
    async getTopStartups() {
        return this.exploreService.getTopStartups();
    }

    @Get('pitches/top')
    @ApiOperation({ summary: 'Get top performing pitches' })
    @ApiResponse({ status: 200, description: 'Top pitches retrieved' })
    async getTopPitches() {
        return this.exploreService.getTopPitches();
    }

    @Get('startups/week')
    @ApiOperation({ summary: 'Get startups of the week' })
    @ApiResponse({ status: 200, description: 'Startups of the week retrieved' })
    async getStartupsOfTheWeek() {
        return this.exploreService.getStartupsOfTheWeek();
    }

    @Get('investors/spotlight')
    @ApiOperation({ summary: 'Get investor spotlight' })
    @ApiResponse({ status: 200, description: 'Investor spotlight retrieved' })
    async getInvestorSpotlight() {
        return this.exploreService.getInvestorSpotlight();
    }

    @Get('battleground/live')
    @ApiOperation({ summary: 'Get live battleground' })
    @ApiResponse({ status: 200, description: 'Live battleground retrieved' })
    async getLiveBattleground() {
        return this.exploreService.getLiveBattleground();
    }
}
