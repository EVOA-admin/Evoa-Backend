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

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global API prefix
    app.setGlobalPrefix('api');

    // Security
    app.use(helmet());

    // CORS - Support multiple origins
    app.enableCors({
        origin: [
            'https://test.evoa.co.in',
            'http://localhost:5173',
            'http://localhost:3000'
        ],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
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
