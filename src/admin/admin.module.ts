import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuardModule } from '../auth/auth-guard.module';
import { BattlegroundRegistration } from '../battleground/entities/battleground-registration.entity';
import { Investor } from '../investors/entities/investor.entity';
import { PricingOrder } from '../pricing/entities/pricing-order.entity';
import { Reel } from '../reels/entities/reel.entity';
import { Startup } from '../startups/entities/startup.entity';
import { User } from '../users/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BattlegroundAdminState } from './entities/battleground-admin-state.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            Startup,
            Investor,
            Reel,
            BattlegroundRegistration,
            PricingOrder,
            BattlegroundAdminState,
        ]),
        AuthGuardModule,
    ],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
