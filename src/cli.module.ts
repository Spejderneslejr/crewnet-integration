import { Logger, Module } from '@nestjs/common';
import {
  CamposMembersInUnit,
  CamposSyncWorkplaceCategoriesAuto,
  CrewnetDeleteCampOSWorkplaceCategories,
  CrewnetDeleteWorkplaceCategories,
  CrewnetGetWorkplaceCategoryMembers,
  CrewnetImportWorkplaces,
  CrewnetSyncWorkplaceCategoriesOld,
  EventGetAll,
  GroupCreateCommand,
  UserCreateCommand,
  WorkplaceCategoriesGetCommand,
  WorkplaceCreateCommand,
  WorkplacesGetCommand,
} from './cli/all.command';
import { CrewnetModule } from './crewnet/crewnet.module';
import { ConfigModule } from '@nestjs/config';
import { CamposModule } from './campos/campos.module';
import { XslxService } from './crewnet/xslx.service';

@Module({
  imports: [
    CrewnetModule,
    CamposModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],

  providers: [
    Logger,
    XslxService,
    CamposMembersInUnit,
    CamposSyncWorkplaceCategoriesAuto,
    CrewnetDeleteCampOSWorkplaceCategories,
    CrewnetDeleteWorkplaceCategories,
    CrewnetGetWorkplaceCategoryMembers,
    CrewnetImportWorkplaces,
    CrewnetSyncWorkplaceCategoriesOld,
    EventGetAll,
    GroupCreateCommand,
    UserCreateCommand,
    WorkplaceCategoriesGetCommand,
    WorkplaceCreateCommand,
    WorkplacesGetCommand,
  ],
})
export class CliModule {}
