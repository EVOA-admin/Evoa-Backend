import { DataSource } from 'typeorm';
import { User, UserRole } from './src/users/entities/user.entity';
import { ChatService } from './src/chat/chat.service';
import { Conversation } from './src/chat/entities/conversation.entity';
import { Message } from './src/chat/entities/message.entity';
import { MessageRequest } from './src/chat/entities/message-request.entity';
import { UserConnection } from './src/users/entities/user-connection.entity';
import { Notification } from './src/notifications/entities/notification.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [User, Conversation, Message, MessageRequest, UserConnection, Notification]
});

async function run() {
  await ds.initialize();
  const chatService = new ChatService(
      ds.getRepository(Conversation),
      ds.getRepository(Message),
      ds.getRepository(MessageRequest),
      ds.getRepository(User),
      ds.getRepository(UserConnection),
      ds.getRepository(Notification)
  );
  
  const users = await ds.getRepository(User).find({ take: 5 });
  if (users.length >= 2) {
      console.log("Testing permission:", users[0].email, "->", users[1].email);
      const perm = await chatService.getPermission(users[0].id, users[1].id);
      console.log("Permission:", perm);
  }
  
  await ds.destroy();
}
run();
