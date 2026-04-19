import { Global, Module } from '@nestjs/common';
import { redisClientFactory, RedisService } from './redis.config';

@Global()
@Module({
    providers: [redisClientFactory, RedisService],
    exports: [redisClientFactory, RedisService],
})
export class RedisModule { }
