import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AmbassadorController } from './ambassador.controller';
import { AmbassadorService } from './ambassador.service';
import { Referral } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { AuthGuardModule } from '../auth/auth-guard.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Referral, User]),
        AuthGuardModule,
    ],
    controllers: [AmbassadorController],
    providers: [AmbassadorService],
    exports: [AmbassadorService],
})
export class AmbassadorModule {}
