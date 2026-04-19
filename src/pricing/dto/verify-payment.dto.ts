import { IsIn, IsString } from 'class-validator';

export class VerifyPaymentDto {
    @IsString()
    @IsIn(['startup_pro', 'investor_premium'])
    planType: 'startup_pro' | 'investor_premium';

    @IsString()
    razorpayOrderId: string;

    @IsString()
    razorpayPaymentId: string;

    @IsString()
    razorpaySignature: string;
}
