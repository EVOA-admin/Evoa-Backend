process.env.TZ = 'UTC'; // Must be first — forces Node.js + pg driver to use UTC for all timestamps

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import compression from 'compression';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import dns from 'dns';

// Force IPv4 to prevent Supabase ENETUNREACH on Render
dns.setDefaultResultOrder('ipv4first');

function getAllowedOrigins() {
    const configuredOrigins = (process.env.CORS_ORIGIN || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    const localOrigins = [
        'http://localhost:3000',
        'http://localhost:4173',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:4173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
    ];

    const productionOrigins = [
        'https://evoa.co.in',
        'https://www.evoa.co.in',
        'https://test.evoa.co.in',
        'https://admin.evoa.co.in',
        'https://www.admin.evoa.co.in',
        'https://evoa-admin.vercel.app',
    ];

    return [...new Set([...configuredOrigins, ...localOrigins, ...productionOrigins])];
}

function isLoopbackOrigin(origin: string) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global API prefix
    app.setGlobalPrefix('api');

    // Security
    app.use(helmet());

    // CORS - Support multiple origins
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            const allowedOrigins = getAllowedOrigins();
            if (allowedOrigins.includes(origin) || isLoopbackOrigin(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });

    // Compression
    app.use(compression());

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Global exception filter
    app.useGlobalFilters(new AllExceptionsFilter());

    // Global response interceptor
    app.useGlobalInterceptors(new TransformInterceptor());

    // Swagger API Documentation
    const config = new DocumentBuilder()
        .setTitle('EVOA API')
        .setDescription('Production-ready backend for EVOA - Startup Discovery & Pitch Platform')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('Authentication', 'User authentication and authorization')
        .addTag('Reels', 'Feed system and reel interactions')
        .addTag('Pitch', 'Pitch details and investor features')
        .addTag('Meetings', 'Investor-founder meeting scheduling')
        .addTag('Startups', 'Startup management and following')
        .addTag('Explore', 'Search, trending, and discovery')
        .addTag('Notifications', 'User notifications')
        .addTag('Users', 'User profile management')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    // Health check endpoint
    app.getHttpAdapter().get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`
  🚀 EVOA Backend is running!
  
  📍 API: http://localhost:${port}/api
  📚 Swagger Docs: http://localhost:${port}/api-docs
  ❤️  Health Check: http://localhost:${port}/health
  
  Environment: ${process.env.NODE_ENV || 'development'}
  `);
}

bootstrap();
