import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ScheduleMeetingDto } from './dto/meetings.dto';

@ApiTags('Meetings')
@Controller('meetings')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class MeetingsController {
    constructor(private readonly meetingsService: MeetingsService) { }

    /** GET /meetings — get all meetings for current user */
    @Get()
    @ApiOperation({ summary: 'Get user meetings' })
    async getUserMeetings(@CurrentUser() user: User) {
        return this.meetingsService.getUserMeetings(user.id);
    }

    /** GET /meetings/:id — get single meeting details */
    @Get(':id')
    @ApiOperation({ summary: 'Get meeting details by ID' })
    async getMeetingById(@Param('id') meetingId: string) {
        return this.meetingsService.getMeetingById(meetingId);
    }

    /** POST /meetings/schedule/:startupId — schedule a meeting with a startup */
    @Post('schedule/:startupId')
    @ApiOperation({ summary: 'Schedule a meeting with a startup (Investor/Incubator only)' })
    async scheduleMeeting(
        @CurrentUser() user: User,
        @Param('startupId') startupId: string,
        @Body() dto: ScheduleMeetingDto,
    ) {
        return this.meetingsService.scheduleMeeting(user.id, startupId, dto);
    }

    /** POST /meetings/:id/accept — founder accepts a meeting */
    @Post(':id/accept')
    @ApiOperation({ summary: 'Accept meeting request (Founder only)' })
    async acceptMeeting(@Param('id') meetingId: string, @CurrentUser() user: User) {
        return this.meetingsService.acceptMeeting(meetingId, user.id);
    }

    /** POST /meetings/:id/reject — founder rejects/cancels a meeting */
    @Post(':id/reject')
    @ApiOperation({ summary: 'Cancel/reject a meeting (Founder only)' })
    async rejectMeeting(@Param('id') meetingId: string, @CurrentUser() user: User) {
        return this.meetingsService.rejectMeeting(meetingId, user.id);
    }
}
