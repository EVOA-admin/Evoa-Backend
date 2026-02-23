import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ExploreService } from './src/explore/explore.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const exploreService = app.get(ExploreService);
  
  console.log("Searching for 'Shri'...");
  try {
    const results = await exploreService.search('Shri', 'all');
    console.log("Found investors:");
    console.log(results.investors);
  } catch (err) {
    console.error("Error during search:", err);
  }
  await app.close();
}
bootstrap();
