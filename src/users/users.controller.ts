import { Controller, Get, Patch, Post, Body, Param, UseGuards } from '@nestjs/common';
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
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    async getProfile(@CurrentUser() user: User) {
        return this.usersService.getProfile(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get any user public profile by ID' })
    @ApiResponse({ status: 200, description: 'Public profile retrieved successfully' })
    async getPublicProfile(@Param('id') userId: string) {
        return this.usersService.getPublicProfile(userId);
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
        return this.usersService.updateProfile(user.id, dto);
    }

    @Post('sync')
    @ApiOperation({ summary: 'Sync user from Supabase Auth (requires auth)' })
    @ApiResponse({ status: 201, description: 'User synced successfully' })
    async syncUser(@CurrentUser() user: User, @Body() dto: SyncUserDto) {
        return this.usersService.syncUser({ ...dto, id: user.supabaseUserId });
    }

    @Post('role')
    @ApiOperation({ summary: 'Update user role after onboarding' })
    @ApiResponse({ status: 200, description: 'Role updated successfully' })
    async updateRole(@CurrentUser() user: User, @Body() dto: UpdateRoleDto) {
        return this.usersService.updateRole(user.id, dto.role);
    }

    @Post('complete-registration')
    @ApiOperation({ summary: 'Mark registration form as completed' })
    @ApiResponse({ status: 200, description: 'Registration marked as complete' })
    async completeRegistration(@CurrentUser() user: User) {
        return this.usersService.completeRegistration(user.id);
    }

    /**
     * GET /users/:id/connection-status
     * Returns { connected: boolean, connectionCount: number }
     */
    @Get(':id/connection-status')
    @ApiOperation({ summary: 'Check if current user is connected with another user' })
    @ApiResponse({ status: 200, description: 'Connection status returned' })
    async getConnectionStatus(@Param('id') targetUserId: string, @CurrentUser() user: User) {
        return this.usersService.getConnectionStatus(targetUserId, user.id);
    }

    /**
     * POST /users/:id/connect
     * Toggles connection on/off and returns { connected, connectionCount }
     */
    @Post(':id/connect')
    @ApiOperation({ summary: 'Toggle connect/disconnect with an investor or incubator' })
    @ApiResponse({ status: 200, description: 'Connection toggled' })
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
