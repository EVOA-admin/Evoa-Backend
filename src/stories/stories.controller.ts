import {
    Controller, Get, Post, Delete, Param, Body,
    UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { StoriesService } from './stories.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { supabaseAdmin } from '../config/supabase.config';

@ApiTags('Stories')
@Controller('stories')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class StoriesController {
    constructor(private readonly storiesService: StoriesService) { }

    /** All non-expired stories — shown in the home feed story bar */
    @Get()
    @ApiOperation({ summary: 'Get all active stories' })
    @ApiResponse({ status: 200, description: 'Active stories list' })
    async getActiveStories() {
        return this.storiesService.getActiveStories();
    }

    /** Current user's own stories */
    @Get('me')
    @ApiOperation({ summary: "Get my active stories" })
    async getMyStories(@CurrentUser() user: User) {
        return this.storiesService.getMyStories(user.id);
    }

    /**
     * Upload a story file (image/video) via multipart form.
     * Uses supabaseAdmin (service role) to bypass Supabase Storage RLS.
     */
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ description: 'Story media file', schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
    @ApiOperation({ summary: 'Upload a story file and create a story record' })
    @ApiResponse({ status: 201, description: 'Story created' })
    async uploadStory(
        @CurrentUser() user: User,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new Error('No file provided');

        const ext = file.originalname.split('.').pop();
        const storagePath = `${user.id}/${Date.now()}.${ext}`;

        const { data, error } = await supabaseAdmin.storage
            .from('stories')
            .upload(storagePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (error) throw new Error(`Storage upload failed: ${error.message}`);

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('stories')
            .getPublicUrl(data.path);

        const dto: CreateStoryDto = { mediaUrl: publicUrl, storagePath: data.path };
        return this.storiesService.createStory(user.id, dto);
    }

    /** Like a story */
    @Post(':id/like')
    @ApiOperation({ summary: 'Like a story' })
    @ApiResponse({ status: 200, description: 'Story liked' })
    async likeStory(@Param('id') id: string, @CurrentUser() user: User) {
        const name = user.fullName || user.email?.split('@')[0] || 'Someone';
        await this.storiesService.likeStory(id, user.id, name);
        return { message: 'Liked' };
    }

    /** Create a story record from an already-uploaded URL (fallback) */
    @Post()
    @ApiOperation({ summary: 'Create a story record from URL' })
    @ApiResponse({ status: 201, description: 'Story created' })
    async createStory(@CurrentUser() user: User, @Body() dto: CreateStoryDto) {
        return this.storiesService.createStory(user.id, dto);
    }

    /** Delete one of the current user's stories */
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a story' })
    @ApiResponse({ status: 200, description: 'Story deleted' })
    async deleteStory(@Param('id') id: string, @CurrentUser() user: User) {
        return this.storiesService.deleteStory(id, user.id);
    }
}
