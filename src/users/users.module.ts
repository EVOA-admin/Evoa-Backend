import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AuthGuardModule } from '../auth/auth-guard.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        AuthGuardModule, // Use the extracted module
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService, TypeOrmModule],
})
export class UsersModule { }
