import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CampCtlModule } from './campctl/campctl.module';
import { CamposModule } from './campos/campos.module';
import { CrewnetModule } from './crewnet/crewnet.module';
import { EndpointsController } from './endpoints/endpoints.controller';
import { EndpointsModule } from './endpoints/endpoints.module';
import { ScheduledTasksService } from './scheduledTasks';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CrewnetModule,
    CamposModule,
    CampCtlModule,
    EndpointsModule,

    ConfigModule.forRoot({ isGlobal: true }),
  ],
  providers: [Logger, ScheduledTasksService, EndpointsController],
})
export class ServerModule {}
