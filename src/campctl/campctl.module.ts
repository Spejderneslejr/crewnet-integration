import { Logger, Module } from '@nestjs/common';
import { CampCtlService } from './campctl.service';
import { ConfigModule } from '@nestjs/config';
import { CamposModule } from '../campos/campos.module';
import { CrewnetModule } from '../crewnet/crewnet.module';

@Module({
  imports: [ConfigModule, CamposModule, CrewnetModule],
  providers: [CampCtlService, Logger],
  exports: [CampCtlService],
  controllers: [],
})
export class CampCtlModule {}
