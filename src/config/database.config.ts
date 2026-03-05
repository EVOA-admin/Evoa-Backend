import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    entities: ['dist/**/*.entity.js'],
    migrations: ['dist/migrations/*.js'],
    // NOTE: synchronize: true auto-creates tables from entities on startup.
    // This is intentional for initial Supabase deployment to create the schema.
    // Disable and use migrations once the schema is stable in production.
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
    poolSize: 20,
    extra: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        ssl: {
            rejectUnauthorized: false,
        },
        family: 4,
    },
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
