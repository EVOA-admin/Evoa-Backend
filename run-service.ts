import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PostsService } from './src/posts/posts.service';

async function bootstrap() {
    console.log("Bootstrapping test...");
    try {
        const app = await NestFactory.createApplicationContext(AppModule);
        const postsService = app.get(PostsService);
        console.log("Calling getRisingStartups...");
        const result = await postsService.getRisingStartups();
        console.log(`Success! Returned ${result.length} startups.`);
        if (result.length > 0) {
            console.log("Sample:", JSON.stringify(result.slice(0, 2), null, 2));
        }
        await app.close();
    } catch (e) {
        console.error("Error executing getRisingStartups:");
        console.error(e);
        process.exit(1);
    }
}
bootstrap();
