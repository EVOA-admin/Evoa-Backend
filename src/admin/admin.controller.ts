import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import {
    AddBattlegroundStartupDto,
    AdminInvestorsQueryDto,
    AdminStartupsQueryDto,
    AdminUsersQueryDto,
    DeclareBattlegroundWinnerDto,
    UpdateAdminInvestorDto,
    UpdateAdminStartupDto,
    UpdateAdminUserDto,
    UpdateBattlegroundRegistrationDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('session')
    @ApiOperation({ summary: 'Get current admin session details' })
    getSession(@CurrentUser() user: User) {
        return this.adminService.getSession(user);
    }

    @Get('overview')
    @ApiOperation({ summary: 'Get admin dashboard overview metrics' })
    getOverview() {
        return this.adminService.getOverview();
    }

    @Get('users')
    @ApiOperation({ summary: 'Get admin user management table' })
    getUsers(@Query() query: AdminUsersQueryDto) {
        return this.adminService.getUsers(query);
    }

    @Patch('users/:id')
    @ApiOperation({ summary: 'Update admin-managed user state' })
    updateUser(@Param('id') userId: string, @Body() dto: UpdateAdminUserDto) {
        return this.adminService.updateUser(userId, dto);
    }

    @Get('startups')
    @ApiOperation({ summary: 'Get startup management data' })
    getStartups(@Query() query: AdminStartupsQueryDto) {
        return this.adminService.getStartups(query);
    }

    @Patch('startups/:id')
    @ApiOperation({ summary: 'Update admin-managed startup state' })
    updateStartup(@Param('id') startupId: string, @Body() dto: UpdateAdminStartupDto) {
        return this.adminService.updateStartup(startupId, dto);
    }

    @Delete('startups/:startupId/pitches/:reelId')
    @ApiOperation({ summary: 'Remove a startup pitch' })
    removeStartupPitch(@Param('startupId') startupId: string, @Param('reelId') reelId: string) {
        return this.adminService.removeStartupPitch(startupId, reelId);
    }

    @Get('investors')
    @ApiOperation({ summary: 'Get investor management data' })
    getInvestors(@Query() query: AdminInvestorsQueryDto) {
        return this.adminService.getInvestors(query);
    }

    @Patch('investors/:userId')
    @ApiOperation({ summary: 'Update admin-managed investor state' })
    updateInvestor(@Param('userId') userId: string, @Body() dto: UpdateAdminInvestorDto) {
        return this.adminService.updateInvestor(userId, dto);
    }

    @Get('battleground')
    @ApiOperation({ summary: 'Get battleground control panel data' })
    getBattleground() {
        return this.adminService.getBattleground();
    }

    @Post('battleground/registrations')
    @ApiOperation({ summary: 'Manually add a startup to battleground' })
    addBattlegroundStartup(@Body() dto: AddBattlegroundStartupDto) {
        return this.adminService.addBattlegroundStartup(dto);
    }

    @Patch('battleground/registrations/:id')
    @ApiOperation({ summary: 'Override selected battleground pitch' })
    updateBattlegroundRegistration(@Param('id') registrationId: string, @Body() dto: UpdateBattlegroundRegistrationDto) {
        return this.adminService.updateBattlegroundRegistration(registrationId, dto);
    }

    @Delete('battleground/registrations/:id')
    @ApiOperation({ summary: 'Remove a startup from battleground' })
    removeBattlegroundRegistration(@Param('id') registrationId: string) {
        return this.adminService.removeBattlegroundRegistration(registrationId);
    }

    @Patch('battleground/winner')
    @ApiOperation({ summary: 'Declare the battleground winner and prize details' })
    declareBattlegroundWinner(@Body() dto: DeclareBattlegroundWinnerDto) {
        return this.adminService.declareBattlegroundWinner(dto);
    }

    @Get('payments')
    @ApiOperation({ summary: 'Get payment monitoring data' })
    getPayments() {
        return this.adminService.getPayments();
    }
}
