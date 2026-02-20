import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncubatorsService } from './incubators.service';
import { IncubatorsController } from './incubators.controller';
import { Incubator } from './entities/incubator.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Incubator]),
        AuthModule,
    ],
    controllers: [IncubatorsController],
    providers: [IncubatorsService],
    exports: [IncubatorsService],
})
export class IncubatorsModule { }
