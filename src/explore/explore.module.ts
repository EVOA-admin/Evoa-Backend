import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import { Startup } from '../startups/entities/startup.entity';
import { Reel } from '../reels/entities/reel.entity';
import { Hashtag } from './entities/hashtag.entity';
import { Investor } from '../investors/entities/investor.entity';
import { Incubator } from '../incubators/entities/incubator.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Startup, Reel, Hashtag, Investor, Incubator]),
        UsersModule,
        AuthModule,
    ],
    controllers: [ExploreController],
    providers: [ExploreService],
})
export class ExploreModule { }
