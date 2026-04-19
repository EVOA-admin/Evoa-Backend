import { IsIn, IsString } from 'class-validator';

export class CreateOrderDto {
    @IsString()
    @IsIn(['startup_pro', 'investor_premium'])
    planType: 'startup_pro' | 'investor_premium';
}
