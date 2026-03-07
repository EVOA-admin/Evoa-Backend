import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostSave } from './entities/post-save.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostWebsiteClick } from './entities/post-website-click.entity';
import { Startup } from '../startups/entities/startup.entity';
import { ReelView } from '../reels/entities/reel-view.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Post,
            PostLike,
            PostSave,
            PostComment,
            PostWebsiteClick,
            Startup,
            ReelView,
            User,
            Notification,
        ]),
        AuthModule,
    ],
    providers: [PostsService],
    controllers: [PostsController],
    exports: [PostsService],
})
export class PostsModule { }
