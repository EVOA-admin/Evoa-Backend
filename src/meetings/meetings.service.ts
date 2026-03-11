import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Meeting, MeetingStatus } from './entities/meeting.entity';
import { Startup } from '../startups/entities/startup.entity';
import { User } from '../users/entities/user.entity';
import { ScheduleMeetingDto } from './dto/meetings.dto';
import { Conversation } from '../chat/entities/conversation.entity';
import { Message, MessageType } from '../chat/entities/message.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class MeetingsService {
    constructor(
        @InjectRepository(Meeting)
        private readonly meetingRepository: Repository<Meeting>,
        @InjectRepository(Startup)
        private readonly startupRepository: Repository<Startup>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Conversation)
        private readonly conversationRepository: Repository<Conversation>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
    ) { }

    /** Schedule a meeting from an Investor/Incubator with a Startup */
    async scheduleMeeting(schedulerId: string, startupId: string, dto: ScheduleMeetingDto) {
        // 1. Load the startup with its founder
        const startup = await this.startupRepository.findOne({
            where: { id: startupId },
            relations: ['founder'],
        });
        if (!startup) throw new NotFoundException('Startup not found');

        const scheduler = await this.userRepository.findOne({ where: { id: schedulerId } });
        if (!scheduler) throw new NotFoundException('Scheduler not found');

        const founderId = startup.founderId;

        // 2. Generate a unique Jitsi room ID
        const videoRoomId = `evoa-${uuidv4()}`;

        // 3. Find or create a conversation between scheduler and founder
        const [lo, hi] = [schedulerId, founderId].sort();
        let conversation = await this.conversationRepository.findOne({
            where: { user1Id: lo, user2Id: hi },
        });
        if (!conversation) {
            conversation = await this.conversationRepository.save(
                this.conversationRepository.create({ user1Id: lo, user2Id: hi }),
            );
        }

        // 4. Save the meeting
        const scheduledAtDate = new Date(dto.scheduledAt);
        const meeting = await this.meetingRepository.save(
            this.meetingRepository.create({
                investorId: schedulerId,
                startupId,
                founderId,
                status: MeetingStatus.SCHEDULED,
                scheduledAt: scheduledAtDate,
                notes: dto.notes,
                videoRoomId,
                conversationId: conversation.id,
            }),
        );

        // 5. Insert a meeting-type message in the chat
        const formattedDate = scheduledAtDate.toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        const formattedTime = scheduledAtDate.toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
        const systemContent = `${scheduler.fullName || 'Investor'} scheduled a meeting with you on ${formattedDate} at ${formattedTime}.`;

        const chatMessage = await this.messageRepository.save(
            this.messageRepository.create({
                conversationId: conversation.id,
                senderId: schedulerId,
                content: systemContent,
                type: MessageType.MEETING,
                meetingId: meeting.id,
            }),
        );

        // Update conversation's last message timestamp
        await this.conversationRepository.update(conversation.id, { lastMessageAt: new Date() });

        // 6. Send notification to the founder/startup
        await this.notificationRepository.save(
            this.notificationRepository.create({
                userId: founderId,
                type: NotificationType.SYSTEM,
                title: '📅 Meeting Scheduled',
                message: `${scheduler.fullName || 'An investor'} scheduled a meeting with you for ${formattedDate} at ${formattedTime}.`,
                link: `/inbox/${conversation.id}`,
            }),
        ).catch(() => { /* non-blocking */ });

        return {
            meeting,
            conversationId: conversation.id,
            messageId: chatMessage.id,
        };
    }

    async acceptMeeting(meetingId: string, userId: string) {
        const meeting = await this.meetingRepository.findOne({
            where: { id: meetingId },
            relations: ['investor', 'founder', 'startup'],
        });
        if (!meeting) throw new NotFoundException('Meeting not found');
        if (meeting.founderId !== userId) throw new ForbiddenException('Only the founder can accept this meeting');

        meeting.status = MeetingStatus.ACCEPTED;
        await this.meetingRepository.save(meeting);
        return meeting;
    }

    async rejectMeeting(meetingId: string, userId: string) {
        const meeting = await this.meetingRepository.findOne({ where: { id: meetingId } });
        if (!meeting) throw new NotFoundException('Meeting not found');
        if (meeting.founderId !== userId) throw new ForbiddenException('Only the founder can reject this meeting');

        meeting.status = MeetingStatus.CANCELLED;
        await this.meetingRepository.save(meeting);
        return meeting;
    }

    async getMeetingById(meetingId: string) {
        const meeting = await this.meetingRepository.findOne({
            where: { id: meetingId },
            relations: ['investor', 'founder', 'startup'],
        });
        if (!meeting) throw new NotFoundException('Meeting not found');
        return meeting;
    }

    async getUserMeetings(userId: string) {
        return this.meetingRepository.find({
            where: [
                { investorId: userId },
                { founderId: userId },
            ],
            relations: ['investor', 'founder', 'startup'],
            order: { scheduledAt: 'ASC' },
        });
    }
}
