import { LogLevel } from '@nestjs/common';
import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli.module';

const logLevels: LogLevel[] = ['log', 'error', 'warn'];

if (process.env.LOG_LEVEL === 'debug') {
  logLevels.push(process.env.LOG_LEVEL);
}
const bootstrap = async () => {
  await CommandFactory.run(CliModule, {
    logger: logLevels,
  });
};

// Bootstrap, and accept this gives us a floating promise as this is the
// convention from NestJS.
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
