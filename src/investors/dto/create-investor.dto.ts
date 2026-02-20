import { IsString, IsOptional, IsUrl, IsArray, IsNumber, IsObject, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvestorDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    tagline?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsUrl()
    website?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    sectors?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    stages?: string[];

    @IsOptional()
    @IsNumber()
    minTicketSize?: number;

    @IsOptional()
    @IsNumber()
    maxTicketSize?: number;

    @IsOptional()
    @IsObject()
    location?: { city: string; state: string; country: string };

    @IsOptional()
    @IsUrl()
    linkedin?: string;
}
