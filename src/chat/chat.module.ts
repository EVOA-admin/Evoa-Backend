import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { MessageRequest } from './entities/message-request.entity';
import { User } from '../users/entities/user.entity';
import { UserConnection } from '../users/entities/user-connection.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Conversation,
            Message,
            MessageRequest,
            User,
            UserConnection,
            Notification,
        ]),
        AuthModule,
    ],
    controllers: [ChatController],
    providers: [ChatService],
    exports: [ChatService],
})
export class ChatModule { }
