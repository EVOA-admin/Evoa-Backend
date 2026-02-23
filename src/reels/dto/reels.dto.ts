import { IsOptional, IsString, IsInt, Min, Max, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum FeedType {
    FOR_YOU = 'for_you',
    FOLLOWING = 'following',
}

export class FeedQueryDto {
    @ApiProperty({
        enum: FeedType,
        required: false,
        description: 'Feed type: for_you or following',
        example: 'for_you'
    })
    @IsOptional()
    @IsString()
    type?: string; // Accept 'foryou', 'for_you', 'following' etc.

    @ApiProperty({ required: false, description: 'Cursor for pagination' })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 20;

    @ApiProperty({ required: false, description: 'Filter by hashtag (without #)' })
    @IsOptional()
    @IsString()
    hashtag?: string;
}

export class CreateCommentDto {
    @ApiProperty({ example: 'Great pitch!' })
    @IsString()
    content: string;

    @ApiProperty({ required: false, description: 'Parent comment ID for replies' })
    @IsOptional()
    @IsUUID()
    parentCommentId?: string;
}

export class ShareReelDto {
    @ApiProperty({ example: 'twitter', required: false })
    @IsOptional()
    @IsString()
    platform?: string;
}

export class CreateReelDto {
    @ApiProperty({ description: 'Public URL of the pitch video' })
    @IsString()
    videoUrl: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    hashtags?: string[];
}
