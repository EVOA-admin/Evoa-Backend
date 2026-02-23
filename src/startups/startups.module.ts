import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StartupsController } from './startups.controller';
import { StartupsService } from './startups.service';
import { Startup } from './entities/startup.entity';
import { Follow } from './entities/follow.entity';
import { Reel } from '../reels/entities/reel.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';

import { AuthModule } from '../auth/auth.module';
import { redisClientFactory, RedisService } from '../config/redis.config';

@Module({
    imports: [
        TypeOrmModule.forFeature([Startup, Follow, Reel, Notification, User]),
        UsersModule,
        AuthModule,
    ],
    controllers: [StartupsController],
    providers: [StartupsService, redisClientFactory, RedisService],
    exports: [StartupsService],
})
export class StartupsModule { }
