import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    /** GET /chat/unread-count — total unread messages + pending requests */
    @Get('unread-count')
    @ApiOperation({ summary: 'Get total unread count (messages + requests)' })
    async getUnreadCount(@CurrentUser() user: User) {
        return this.chatService.getUnreadCount(user.id);
    }

    /** GET /chat/permission/:userId — check if user can direct message a target */
    @Get('permission/:userId')
    @ApiOperation({ summary: 'Check direct messaging permission and rules against a user' })
    async getPermission(@CurrentUser() user: User, @Param('userId') targetId: string) {
        return this.chatService.getPermission(user.id, targetId);
    }

    /** GET /chat/conversation-with/:userId — find or create conversation with a user */
    @Get('conversation-with/:userId')
    @ApiOperation({ summary: 'Find or create a conversation with a specific user' })
    async getConversationWith(@CurrentUser() user: User, @Param('userId') targetId: string) {
        return this.chatService.getConversationWith(user.id, targetId);
    }

    /** GET /chat/conversations — all active conversations */
    @Get('conversations')
    @ApiOperation({ summary: 'Get all conversations for the current user' })
    async getConversations(@CurrentUser() user: User) {
        return this.chatService.getConversations(user.id);
    }

    /** GET /chat/conversations/:id/messages — messages in a conversation */
    @Get('conversations/:id/messages')
    @ApiOperation({ summary: 'Get messages for a conversation' })
    async getMessages(@Param('id') conversationId: string, @CurrentUser() user: User) {
        return this.chatService.getMessages(conversationId, user.id);
    }

    /** POST /chat/send — send a direct message */
    @Post('send')
    @ApiOperation({ summary: 'Send a message to another user (permission checked)' })
    async sendMessage(
        @CurrentUser() user: User,
        @Body() body: { toUserId: string; content: string },
    ) {
        return this.chatService.sendMessage(user.id, body.toUserId, body.content);
    }

    /** GET /chat/requests — incoming message requests */
    @Get('requests')
    @ApiOperation({ summary: 'Get incoming message requests' })
    async getRequests(@CurrentUser() user: User) {
        return this.chatService.getRequests(user.id);
    }

    /** POST /chat/request — send a message request when direct messages are blocked */
    @Post('request')
    @ApiOperation({ summary: 'Send a message request to a user whose DMs are restricted' })
    async sendRequest(
        @CurrentUser() user: User,
        @Body() body: { toUserId: string; message?: string },
    ) {
        return this.chatService.sendRequest(user.id, body.toUserId, body.message || '');
    }

    /** PATCH /chat/requests/:id — accept or ignore a message request */
    @Patch('requests/:id')
    @ApiOperation({ summary: 'Accept or ignore a message request' })
    async respondToRequest(
        @Param('id') requestId: string,
        @CurrentUser() user: User,
        @Body() body: { action: 'accept' | 'ignore' },
    ) {
        return this.chatService.respondToRequest(requestId, user.id, body.action);
    }
}
