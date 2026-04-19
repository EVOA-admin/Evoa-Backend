import { IsOptional, IsString } from 'class-validator';

export class MarkBattlegroundPaymentFailedDto {
    @IsString()
    razorpayOrderId: string;

    @IsOptional()
    @IsString()
    reason?: string;
}
