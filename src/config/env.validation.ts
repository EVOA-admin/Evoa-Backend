import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, IsEnum, IsOptional, validateSync } from 'class-validator';

enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

class EnvironmentVariables {
    @IsOptional()
    @IsEnum(Environment)
    NODE_ENV: Environment = Environment.Development;

    @IsOptional()
    @IsNumber()
    PORT: number = 3000;

    @IsString()
    JWT_SECRET: string;

    @IsOptional()
    @IsString()
    JWT_EXPIRATION: string = '7d';

    @IsString()
    DATABASE_URL: string;

    @IsOptional()
    @IsString()
    SUPABASE_URL: string = '';

    @IsOptional()
    @IsString()
    SUPABASE_ANON_KEY: string = '';

    @IsOptional()
    @IsString()
    SUPABASE_SERVICE_ROLE_KEY: string = '';

    @IsOptional()
    @IsString()
    CORS_ORIGIN: string = 'http://localhost:5173';

    @IsOptional()
    @IsString()
    FRONTEND_URL: string = 'http://localhost:5173';
}

export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToClass(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        const errorMessages = errors.map(e =>
            `${e.property}: ${Object.values(e.constraints || {}).join(', ')}`
        ).join('\n');
        throw new Error(`Environment validation failed:\n${errorMessages}`);
    }

    return validatedConfig;
}
