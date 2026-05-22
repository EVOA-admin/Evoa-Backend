import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    /** Array of image URLs for multi-photo posts (carousel) */
    @ApiProperty({ type: [String], required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    imageUrls?: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    caption?: string;

    @ApiProperty({ type: [String], required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    hashtags?: string[];
}
