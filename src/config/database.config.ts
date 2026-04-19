import { DataSource, DataSourceOptions } from 'typeorm';
import { parse as parseConnectionString } from 'pg-connection-string';
import { config } from 'dotenv';

config();

const hasLocalDatabaseConfig = Boolean(
    process.env.DATABASE_HOST &&
    process.env.DATABASE_PORT &&
    process.env.DATABASE_USERNAME &&
    process.env.DATABASE_NAME,
);

const useDatabaseUrl = process.env.DATABASE_USE_URL === 'true'
    || (process.env.NODE_ENV === 'production' && !!process.env.DATABASE_URL)
    || (!hasLocalDatabaseConfig && !!process.env.DATABASE_URL);

const useSsl = process.env.DATABASE_SSL === 'true' || useDatabaseUrl;
const parsedDatabaseUrl = useDatabaseUrl && process.env.DATABASE_URL
    ? parseConnectionString(process.env.DATABASE_URL)
    : null;

export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    ...(useDatabaseUrl
        ? {
            host: parsedDatabaseUrl?.host || undefined,
            port: parsedDatabaseUrl?.port ? parseInt(parsedDatabaseUrl.port, 10) : undefined,
            username: parsedDatabaseUrl?.user || undefined,
            password: parsedDatabaseUrl?.password || undefined,
            database: parsedDatabaseUrl?.database || undefined,
        }
        : {
            host: process.env.DATABASE_HOST || 'localhost',
            port: parseInt(process.env.DATABASE_PORT || '5432', 10),
            username: process.env.DATABASE_USERNAME || 'postgres',
            password: process.env.DATABASE_PASSWORD || 'postgres',
            database: process.env.DATABASE_NAME || 'evoa',
        }),
    ...(useSsl
        ? {
            ssl: {
                rejectUnauthorized: false,
            },
        }
        : {}),
    entities: ['dist/**/*.entity.js'],
    migrations: ['dist/migrations/*.js'],
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
    poolSize: 20,
    extra: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        family: 4,
        ...(useSsl
            ? {
                ssl: {
                    rejectUnauthorized: false,
                },
            }
            : {}),
    },
};


const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
