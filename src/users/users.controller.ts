import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UpdateProfileDto, SyncUserDto, UpdateRoleDto } from './dto/users.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    async getProfile(@CurrentUser() user: User) {
        return this.usersService.getProfile(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get any user public profile by ID' })
    async getPublicProfile(@Param('id') userId: string) {
        return this.usersService.getPublicProfile(userId);
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update current user profile' })
    async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
        return this.usersService.updateProfile(user.id, dto);
    }

    @Post('sync')
    @ApiOperation({ summary: 'Sync user from Supabase Auth' })
    async syncUser(@CurrentUser() user: User, @Body() dto: SyncUserDto) {
        return this.usersService.syncUser({ ...dto, id: user.supabaseUserId });
    }

    @Post('role')
    @ApiOperation({ summary: 'Update user role after onboarding' })
    async updateRole(@CurrentUser() user: User, @Body() dto: UpdateRoleDto) {
        return this.usersService.updateRole(user.id, dto.role);
    }

    @Post('complete-registration')
    @ApiOperation({ summary: 'Mark registration form as completed' })
    async completeRegistration(@CurrentUser() user: User) {
        return this.usersService.completeRegistration(user.id);
    }

    @Delete('me')
    @ApiOperation({ summary: 'Permanently delete the current user account and all associated data' })
    @ApiResponse({ status: 200, description: 'Account deleted' })
    async deleteAccount(@CurrentUser() user: User) {
        return this.usersService.deleteAccount(user.id);
    }

    /** GET /users/:id/follow-status — check if current user follows target */
    @Get(':id/follow-status')
    @ApiOperation({ summary: 'Check if current user follows another user' })
    async getFollowStatus(@Param('id') targetUserId: string, @CurrentUser() user: User) {
        return this.usersService.getFollowStatus(targetUserId, user.id);
    }

    /** GET /users/:id/connection-status — backward compat alias */
    @Get(':id/connection-status')
    @ApiOperation({ summary: '[Compat] Check follow/connection status with another user' })
    async getConnectionStatus(@Param('id') targetUserId: string, @CurrentUser() user: User) {
        return this.usersService.getConnectionStatus(targetUserId, user.id);
    }

    /** GET /users/:id/followers — who follows this user */
    @Get(':id/followers')
    @ApiOperation({ summary: 'Get followers of a user' })
    async getFollowers(@Param('id') userId: string) {
        return this.usersService.getFollowers(userId);
    }

    /** GET /users/:id/following — who this user follows */
    @Get(':id/following')
    @ApiOperation({ summary: 'Get users that this user is following' })
    async getFollowing(@Param('id') userId: string) {
        return this.usersService.getFollowing(userId);
    }

    /** POST /users/:id/connect — Toggle follow/unfollow */
    @Post(':id/connect')
    @ApiOperation({ summary: 'Toggle follow/unfollow a user (investor, incubator, or viewer)' })
    async toggleConnect(@Param('id') targetUserId: string, @CurrentUser() user: User) {
        return this.usersService.toggleConnect(targetUserId, user.id);
    }

    /** @deprecated Use POST :id/connect instead */
    @Post(':id/connect-click')
    @ApiOperation({ summary: '[Deprecated] Track connect click — use POST :id/connect' })
    async trackConnectClick(@Param('id') targetUserId: string, @CurrentUser() user: User) {
        return this.usersService.toggleConnect(targetUserId, user.id);
    }
}
