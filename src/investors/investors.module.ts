import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestorsService } from './investors.service';
import { InvestorsController } from './investors.controller';
import { Investor } from './entities/investor.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Investor]),
        AuthModule,
    ],
    controllers: [InvestorsController],
    providers: [InvestorsService],
    exports: [InvestorsService],
})
export class InvestorsModule { }
