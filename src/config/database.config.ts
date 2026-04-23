import { DataSource, DataSourceOptions } from 'typeorm';
import { parse as parseConnectionString } from 'pg-connection-string';
import { config } from 'dotenv';

config();

const parseNumber = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt((value || '').trim(), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const hasLocalDatabaseConfig = Boolean(
    process.env.DATABASE_HOST &&
    process.env.DATABASE_PORT &&
    process.env.DATABASE_USERNAME &&
    process.env.DATABASE_NAME,
);

const useDatabaseUrl = process.env.DATABASE_USE_URL === 'true'
    || (process.env.NODE_ENV === 'production' && !!process.env.DATABASE_URL)
    || (!hasLocalDatabaseConfig && !!process.env.DATABASE_URL);

const isProduction = process.env.NODE_ENV === 'production';
const useSsl = process.env.DATABASE_SSL === 'true' || useDatabaseUrl;
const parsedDatabaseUrl = useDatabaseUrl && process.env.DATABASE_URL
    ? parseConnectionString(process.env.DATABASE_URL)
    : null;
const poolMax = parseNumber(process.env.DATABASE_POOL_MAX, isProduction ? 3 : 10);
const poolMin = parseNumber(process.env.DATABASE_POOL_MIN, isProduction ? 0 : 1);
const idleTimeoutMillis = parseNumber(process.env.DATABASE_IDLE_TIMEOUT_MS, 10000);
const connectionTimeoutMillis = parseNumber(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 10000);
const maxQueryExecutionTime = parseNumber(process.env.DATABASE_SLOW_QUERY_MS, 1500);
const synchronize = process.env.TYPEORM_SYNCHRONIZE
    ? process.env.TYPEORM_SYNCHRONIZE === 'true'
    : !isProduction;

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
    synchronize,
    logging: process.env.NODE_ENV === 'development',
    maxQueryExecutionTime,
    poolSize: poolMax,
    extra: {
        max: poolMax,
        min: poolMin,
        idleTimeoutMillis,
        connectionTimeoutMillis,
        keepAlive: true,
        application_name: process.env.APP_NAME || 'EVOA Backend',
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
