import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ExploreService } from './src/explore/explore.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const exploreService = app.get(ExploreService);
  
  console.log("Searching for 'Shri' (bypassing Redis by passing unique string)...");
  try {
    const results = await exploreService.search('Shri', 'all-test-bypass-' + Date.now());
    console.log("Found investors count:", results.investors?.length);
    console.log(results.investors);
  } catch (err) {
    console.error("Error during search:", err);
  }
  await app.close();
  process.exit(0);
}
bootstrap();
