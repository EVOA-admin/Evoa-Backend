import { IsString, IsOptional, IsUrl, IsArray, IsNumber, IsObject, IsDateString } from 'class-validator';

export class CreateIncubatorDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    programTypes?: string[];

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
    @IsObject()
    location?: { city: string; state: string; country: string };

    @IsOptional()
    @IsDateString()
    applicationDeadline?: string;

    @IsOptional()
    @IsNumber()
    cohortSize?: number;
}
