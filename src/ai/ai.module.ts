import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { InvestorAiLog } from './entities/investor-ai-log.entity';
import { Startup } from '../startups/entities/startup.entity';
import { Reel } from '../reels/entities/reel.entity';
import { AuthGuardModule } from '../auth/auth-guard.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([InvestorAiLog, Startup, Reel]),
        AuthGuardModule,
    ],
    controllers: [AiController],
    providers: [AiService],
    exports: [AiService],
})
export class AiModule { }
