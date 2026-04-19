import { IsString } from 'class-validator';

export class VerifyBattlegroundPaymentDto {
    @IsString()
    razorpayOrderId: string;

    @IsString()
    razorpayPaymentId: string;

    @IsString()
    razorpaySignature: string;
}
