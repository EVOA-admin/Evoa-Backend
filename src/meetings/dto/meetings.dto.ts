import { IsOptional, IsString, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleMeetingDto {
    @ApiProperty({ description: 'Meeting date and time (ISO 8601)' })
    @IsNotEmpty()
    @IsDateString()
    scheduledAt: Date;

    @ApiProperty({ required: false, description: 'Optional notes or agenda for the meeting' })
    @IsOptional()
    @IsString()
    notes?: string;
}
