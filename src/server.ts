import { NestFactory } from '@nestjs/core';
import { ServerModule } from './server.module';

async function bootstrap() {
  const app = await NestFactory.create(ServerModule);
  await app.listen(3000);
}

// Bootstrap, and accept this gives us a floating promise as this is the
// convention from NestJS.
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
