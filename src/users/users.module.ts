import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { UserConnection } from './entities/user-connection.entity';
import { AuthGuardModule } from '../auth/auth-guard.module';
import { Investor } from '../investors/entities/investor.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Notification, UserConnection, Investor]),
        AuthGuardModule,
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService, TypeOrmModule],
})
export class UsersModule { }
