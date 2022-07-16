import { LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ServerModule } from './server.module';

const logLevels: LogLevel[] = ['log', 'error', 'warn'];

if (process.env.LOG_LEVEL === 'debug') {
  logLevels.push(process.env.LOG_LEVEL);
}

async function bootstrap() {
  const app = await NestFactory.create(ServerModule, {
    logger: logLevels,
  });
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}

// Bootstrap, and accept this gives us a floating promise as this is the
// convention from NestJS.
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
