import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoryDto {
    @ApiProperty({ description: 'Public URL of the story media (image/video)' })
    @IsString()
    mediaUrl: string;

    @ApiProperty({ description: 'Supabase storage path for cleanup', required: false })
    @IsOptional()
    @IsString()
    storagePath?: string;
}
