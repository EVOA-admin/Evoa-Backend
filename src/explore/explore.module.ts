import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import { Startup } from '../startups/entities/startup.entity';
import { Reel } from '../reels/entities/reel.entity';
import { Hashtag } from './entities/hashtag.entity';
import { UsersModule } from '../users/users.module';
import { redisClientFactory, RedisService } from '../config/redis.config';

@Module({
    imports: [
        TypeOrmModule.forFeature([Startup, Reel, Hashtag]),
        UsersModule,
    ],
    controllers: [ExploreController],
    providers: [ExploreService, redisClientFactory, RedisService],
})
export class ExploreModule { }
