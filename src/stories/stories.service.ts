import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Story } from './entities/story.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class StoriesService {
    constructor(
        @InjectRepository(Story)
        private readonly storyRepository: Repository<Story>,
        private readonly notificationsService: NotificationsService,
    ) { }

    /** Create a new story — expires in 24 hours */
    async createStory(userId: string, dto: CreateStoryDto): Promise<Story> {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const story = this.storyRepository.create({
            userId,
            mediaUrl: dto.mediaUrl,
            storagePath: dto.storagePath,
            expiresAt,
        });

        return this.storyRepository.save(story);
    }

    /** Get all non-expired stories (for the home feed story bar) */
    async getActiveStories(): Promise<Story[]> {
        return this.storyRepository.find({
            where: { expiresAt: MoreThan(new Date()) },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }

    /** Get current user's active stories */
    async getMyStories(userId: string): Promise<Story[]> {
        return this.storyRepository.find({
            where: { userId, expiresAt: MoreThan(new Date()) },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }

    /** Like a story and notify the owner */
    async likeStory(storyId: string, likerId: string, likerName: string): Promise<void> {
        const story = await this.storyRepository.findOne({
            where: { id: storyId },
            relations: ['user'],
        });
        if (!story) return;

        await this.storyRepository.increment({ id: storyId }, 'likeCount', 1);

        // Notify the story owner (skip if liking own story)
        if (story.userId !== likerId) {
            await this.notificationsService.createNotification(
                story.userId,
                NotificationType.SYSTEM,
                '❤️ Someone liked your story',
                `${likerName} liked your story`,
            );
        }
    }

    /** Delete a story by id */
    async deleteStory(storyId: string, userId: string): Promise<void> {
        await this.storyRepository.delete({ id: storyId, userId });
    }
}
