import { Logger } from '@nestjs/common';
import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli.module';

const bootstrap = async () => {
  await CommandFactory.run(CliModule, new Logger());
};

// Bootstrap, and accept this gives us a floating promise as this is the
// convention from NestJS.
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
