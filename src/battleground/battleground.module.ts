import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BattlegroundController } from './battleground.controller';
import { BattlegroundService } from './battleground.service';
import { BattlegroundRegistration } from './entities/battleground-registration.entity';
import { User } from '../users/entities/user.entity';
import { Startup } from '../startups/entities/startup.entity';
import { Reel } from '../reels/entities/reel.entity';
import { AuthGuardModule } from '../auth/auth-guard.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([BattlegroundRegistration, User, Startup, Reel]),
        AuthGuardModule,
    ],
    controllers: [BattlegroundController],
    providers: [BattlegroundService],
    exports: [BattlegroundService],
})
export class BattlegroundModule { }
