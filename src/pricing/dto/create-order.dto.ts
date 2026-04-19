import { IsIn, IsString } from 'class-validator';

export class CreateOrderDto {
    @IsString()
    @IsIn(['startup', 'investor'])
    planType: 'startup' | 'investor';
}
