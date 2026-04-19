// import { createClient } from 'redis';

// export const redisClientFactory = {
//     provide: 'REDIS_CLIENT',
//     useFactory: async () => {
//         const client = createClient({
//             socket: {
//                 host: process.env.REDIS_HOST || 'localhost',
//                 port: parseInt(process.env.REDIS_PORT || '6379', 10),
//             },
//             password: process.env.REDIS_PASSWORD || undefined,
//         });

//         client.on('error', (err) => console.error('Redis Client Error', err));
//         client.on('connect', () => console.log('Redis Client Connected'));

//         await client.connect();
//         return client;
//     },
// };

// export class RedisService {
//     constructor(private readonly client: any) { }

//     async get(key: string): Promise<string | null> {
//         return await this.client.get(key);
//     }

//     async set(key: string, value: string, ttl?: number): Promise<void> {
//         if (ttl) {
//             await this.client.setEx(key, ttl, value);
//         } else {
//             await this.client.set(key, value);
//         }
//     }

//     async del(key: string): Promise<void> {
//         await this.client.del(key);
//     }

//     async exists(key: string): Promise<boolean> {
//         return (await this.client.exists(key)) === 1;
//     }

//     async incr(key: string): Promise<number> {
//         return await this.client.incr(key);
//     }

//     async expire(key: string, seconds: number): Promise<void> {
//         await this.client.expire(key, seconds);
//     }
// }


import { createClient } from 'redis';

let redisClientPromise: Promise<any> | null = null;
let hasLoggedRedisFailure = false;

export const redisClientFactory = {
    provide: 'REDIS_CLIENT',
    useFactory: async () => {
        if (redisClientPromise) {
            return redisClientPromise;
        }

        const useRedisUrl = process.env.REDIS_USE_URL === 'true'
            || (process.env.NODE_ENV === 'production' && !!process.env.REDIS_URL)
            || (!process.env.REDIS_HOST && !!process.env.REDIS_URL);
        const redisUrl = process.env.REDIS_URL || '';
        const shouldUseTls = redisUrl.startsWith('rediss://') || useRedisUrl;

        const client = useRedisUrl
            ? createClient({
                url: redisUrl,
                socket: {
                    tls: shouldUseTls,
                    reconnectStrategy: false,
                },
            })
            : createClient({
                socket: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379', 10),
                    reconnectStrategy: false,
                },
                password: process.env.REDIS_PASSWORD || undefined,
            });

        redisClientPromise = (async () => {
            client.on('error', (err) => {
                if (!hasLoggedRedisFailure) {
                    hasLoggedRedisFailure = true;
                    console.warn('⚠️ Redis is unavailable. Continuing without cache.', err);
                }
            });

            client.on('connect', () => {
                hasLoggedRedisFailure = false;
                console.log('✅ Redis Client Connected');
            });

            try {
                await client.connect();
                return client;
            } catch (err) {
                if (!hasLoggedRedisFailure) {
                    hasLoggedRedisFailure = true;
                    console.warn('⚠️ Redis connection failed, disabling gracefully:', err);
                }
                try {
                    client.removeAllListeners();
                    await client.quit().catch(() => undefined);
                } catch {
                    // Ignore cleanup issues when the client never connected.
                }
                return null;
            }
        })();

        return redisClientPromise;
    },
};

export class RedisService {
    constructor(private readonly client: any) { }

    private isDisabled() {
        return !this.client;
    }

    async get(key: string): Promise<string | null> {
        if (this.isDisabled()) return null;
        return this.client.get(key);
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (this.isDisabled()) return;
        if (ttl) {
            await this.client.setEx(key, ttl, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        if (this.isDisabled()) return;
        await this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        if (this.isDisabled()) return false;
        return (await this.client.exists(key)) === 1;
    }

    async incr(key: string): Promise<number> {
        if (this.isDisabled()) return 0;
        return this.client.incr(key);
    }

    async expire(key: string, seconds: number): Promise<void> {
        if (this.isDisabled()) return;
        await this.client.expire(key, seconds);
    }
}
