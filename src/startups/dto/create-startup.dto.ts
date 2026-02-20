import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsEmail, ValidateNested, IsUrl, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class FounderDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    @IsOptional()
    email: string;

    @IsString()
    @IsOptional()
    mobile: string;

    @IsString()
    @IsNotEmpty()
    role: string;

    @IsString()
    @IsOptional()
    photoUrl?: string;
}

class LocationDto {
    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    state: string;

    @IsString()
    @IsNotEmpty()
    country: string;
}

class VerificationDto {
    @IsString()
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsOptional()
    value: string;

    @IsString()
    @IsOptional()
    documentUrl?: string;

    @IsString()
    @IsNotEmpty()
    entityType: string;
}

class SocialLinksDto {
    @IsUrl()
    @IsOptional()
    linkedin?: string;

    @IsUrl()
    @IsOptional()
    instagram?: string;

    @IsUrl()
    @IsOptional()
    youtube?: string;

    @IsUrl()
    @IsOptional()
    website?: string;

    @IsUrl()
    @IsOptional()
    playStore?: string;

    @IsUrl()
    @IsOptional()
    productDemo?: string;
}

class TeamMemberDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    role: string;

    @IsUrl()
    @IsOptional()
    linkedin?: string;

    @IsString()
    @IsOptional()
    image?: string;
}

export class CreateStartupDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsOptional()
    tagline: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsString()
    @IsOptional()
    logoUrl?: string;

    @IsString()
    @IsOptional()
    website?: string;

    @IsEmail()
    @IsOptional()
    companyEmail: string;

    @IsArray()
    @IsString({ each: true })
    industries: string[];

    @IsString()
    @IsNotEmpty()
    stage: string;

    @ValidateNested()
    @Type(() => LocationDto)
    location: LocationDto;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FounderDto)
    founders: FounderDto[];

    @ValidateNested()
    @Type(() => VerificationDto)
    @IsOptional()
    verification: VerificationDto;

    @IsString()
    @IsOptional()
    pitchVideoUrl?: string;

    @IsString()
    @IsOptional()
    pitchDeckUrl?: string;

    @IsNumber()
    @IsOptional()
    amountRaising: number;

    @IsNumber()
    @IsOptional()
    equityGiving: number;

    @IsNumber()
    @IsOptional()
    preMoneyValuation: number;

    @ValidateNested()
    @Type(() => SocialLinksDto)
    @IsOptional()
    socialLinks: SocialLinksDto;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TeamMemberDto)
    @IsOptional()
    teamMembers: TeamMemberDto[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    categoryTags: string[];
}
