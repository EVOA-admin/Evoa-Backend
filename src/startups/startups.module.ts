import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StartupsController } from './startups.controller';
import { StartupsService } from './startups.service';
import { Startup } from './entities/startup.entity';
import { Follow } from './entities/follow.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Startup, Follow]),
        UsersModule,
        AuthModule,
    ],
    controllers: [StartupsController],
    providers: [StartupsService],
    exports: [StartupsService],
})
export class StartupsModule { }
