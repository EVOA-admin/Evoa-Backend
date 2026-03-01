import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
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
    @ApiOperation({ summary: 'Get all recent posts — startup posts enriched with stats' })
    @ApiResponse({ status: 200, description: 'All posts' })
    async getAllPosts(@CurrentUser() user: User) {
        return this.postsService.getAllPosts(user.id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new post (auto-links startup profile if posted by a startup)' })
    @ApiResponse({ status: 201, description: 'Post created successfully' })
    async createPost(@CurrentUser() user: User, @Body() dto: CreatePostDto) {
        return this.postsService.createPost(user.id, dto);
    }

    @Get('me')
    @ApiOperation({ summary: "Get current user's posts" })
    async getMyPosts(@CurrentUser() user: User) {
        return this.postsService.getMyPosts(user.id);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Get posts by userId' })
    async getUserPosts(@Param('userId') userId: string, @CurrentUser() user: User) {
        return this.postsService.getUserPosts(userId, user.id);
    }

    // ── Likes ──────────────────────────────────────────────────────────────

    @Post(':id/like')
    @ApiOperation({ summary: 'Like a post (idempotent)' })
    async likePost(@Param('id') postId: string, @CurrentUser() user: User) {
        return this.postsService.likePost(postId, user.id);
    }

    @Delete(':id/like')
    @ApiOperation({ summary: 'Unlike a post' })
    async unlikePost(@Param('id') postId: string, @CurrentUser() user: User) {
        return this.postsService.unlikePost(postId, user.id);
    }

    // ── Clickthrough ────────────────────────────────────────────────────────

    @Post(':id/website-click')
    @ApiOperation({ summary: 'Record a unique website click — counted only once per user' })
    async recordWebsiteClick(@Param('id') postId: string, @CurrentUser() user: User) {
        return this.postsService.recordWebsiteClick(postId, user.id);
    }

    // ── Comments ────────────────────────────────────────────────────────────

    @Post(':id/comments')
    @ApiOperation({ summary: 'Add a comment to a post' })
    async addComment(
        @Param('id') postId: string,
        @CurrentUser() user: User,
        @Body('content') content: string,
    ) {
        return this.postsService.addComment(postId, user.id, content);
    }

    @Get(':id/comments')
    @ApiOperation({ summary: 'Get all comments on a post' })
    async getComments(@Param('id') postId: string) {
        return this.postsService.getComments(postId);
    }

    @Get(':id/investor-thoughts')
    @ApiOperation({ summary: "Get investor/incubator comments only — Investor's Thoughts section" })
    async getInvestorThoughts(@Param('id') postId: string) {
        return this.postsService.getInvestorThoughts(postId);
    }
}
