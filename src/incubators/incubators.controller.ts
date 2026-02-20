import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { IncubatorsService } from './incubators.service';
import { CreateIncubatorDto } from './dto/create-incubator.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('incubators')
@UseGuards(SupabaseAuthGuard)
export class IncubatorsController {
    constructor(private readonly incubatorsService: IncubatorsService) { }

    @Post()
    create(@CurrentUser() user: User, @Body() dto: CreateIncubatorDto) {
        return this.incubatorsService.create(user.id, dto);
    }

    @Get('my')
    getMyProfile(@CurrentUser() user: User) {
        return this.incubatorsService.findMyIncubatorProfile(user.id);
    }
}
