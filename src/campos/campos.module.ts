import { Logger, Module } from '@nestjs/common';
import { CamposService } from './campos.service';
import { ApiconfigService } from './apiconfig.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [CamposService, ApiconfigService, Logger],
  exports: [CamposService],
  controllers: [],
})
export class CamposModule {}
