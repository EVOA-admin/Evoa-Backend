import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Story } from './entities/story.entity';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Story]),
        AuthModule,
        NotificationsModule,
        MulterModule.register({ storage: memoryStorage() }),
    ],
    providers: [StoriesService],
    controllers: [StoriesController],
    exports: [StoriesService],
})
export class StoriesModule { }
