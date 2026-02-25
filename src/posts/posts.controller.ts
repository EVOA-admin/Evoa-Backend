import { Controller, Get, Post, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';

@ApiTags('Posts')
@Controller('posts')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class PostsController {
    constructor(private readonly postsService: PostsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all recent posts (feed) — includes isLiked for the current user' })
    @ApiResponse({ status: 200, description: 'All posts' })
    async getAllPosts(@CurrentUser() user: User) {
        return this.postsService.getAllPosts(user.id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new post' })
    @ApiResponse({ status: 201, description: 'Post created successfully' })
    async createPost(@CurrentUser() user: User, @Body() dto: CreatePostDto) {
        return this.postsService.createPost(user.id, dto);
    }

    @Get('me')
    @ApiOperation({ summary: "Get current user's posts" })
    @ApiResponse({ status: 200, description: "User's posts" })
    async getMyPosts(@CurrentUser() user: User) {
        return this.postsService.getMyPosts(user.id);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Get posts by userId' })
    @ApiResponse({ status: 200, description: "User's posts" })
    async getUserPosts(@Param('userId') userId: string, @CurrentUser() user: User) {
        return this.postsService.getUserPosts(userId, user.id);
    }

    @Post(':id/like')
    @ApiOperation({ summary: 'Like a post (idempotent — safe to call multiple times)' })
    @ApiResponse({ status: 201, description: 'Post liked' })
    async likePost(@Param('id') postId: string, @CurrentUser() user: User) {
        return this.postsService.likePost(postId, user.id);
    }

    @Delete(':id/like')
    @ApiOperation({ summary: 'Unlike a post' })
    @ApiResponse({ status: 200, description: 'Post unliked' })
    async unlikePost(@Param('id') postId: string, @CurrentUser() user: User) {
        return this.postsService.unlikePost(postId, user.id);
    }
}
