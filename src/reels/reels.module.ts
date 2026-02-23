import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';
import { Reel } from './entities/reel.entity';
import { ReelLike } from './entities/reel-like.entity';
import { ReelComment } from './entities/reel-comment.entity';
import { ReelShare } from './entities/reel-share.entity';
import { ReelSave } from './entities/reel-save.entity';
import { ReelView } from './entities/reel-view.entity';
import { Follow } from '../startups/entities/follow.entity';
import { Startup } from '../startups/entities/startup.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { redisClientFactory, RedisService } from '../config/redis.config';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Reel, ReelLike, ReelComment, ReelShare, ReelSave, ReelView, Follow, Startup, Notification, User]),
        UsersModule,
        AuthModule,
    ],
    controllers: [ReelsController],
    providers: [ReelsService, redisClientFactory, RedisService],
    exports: [ReelsService],
})
export class ReelsModule { }
