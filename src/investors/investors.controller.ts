import { Controller, Post, Body, Get, UseGuards, Patch } from '@nestjs/common';
import { InvestorsService } from './investors.service';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('investors')
@UseGuards(SupabaseAuthGuard)
export class InvestorsController {
    constructor(private readonly investorsService: InvestorsService) { }

    @Post()
    create(@CurrentUser() user: User, @Body() dto: CreateInvestorDto) {
        return this.investorsService.create(user.id, dto);
    }

    @Get('my')
    getMyProfile(@CurrentUser() user: User) {
        return this.investorsService.findMyInvestorProfile(user.id);
    }

    @Patch('my')
    updateMyProfile(@CurrentUser() user: User, @Body() dto: Partial<CreateInvestorDto>) {
        return this.investorsService.updateMyProfile(user.id, dto);
    }
}
