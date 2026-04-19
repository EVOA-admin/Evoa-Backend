import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class ApplyReferralDto {
    @ApiProperty({ description: '16-character ambassador referral code', example: 'ADITYA7X3KR9PQMN' })
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
    @IsString()
    @Length(16, 16, { message: 'Referral code must be exactly 16 characters' })
    @Matches(/^[A-Z0-9]+$/, { message: 'Referral code must be uppercase alphanumeric only' })
    referralCode: string;
}

export class ValidateReferralDto {
    @ApiProperty({ description: 'Referral code to validate', example: 'ADITYA7X3KR9PQMN' })
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
    @IsString()
    @Length(1, 20)
    referralCode: string;
}
