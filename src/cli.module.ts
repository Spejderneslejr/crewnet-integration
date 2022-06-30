import { Logger, Module } from '@nestjs/common';
import {
  CamposMembersInUnit,
  CamposSyncWorkplaceCategoriesAuto,
  CamposSyncWorkplaceCategoryByUnit,
  ConvertSpreadsheetImages,
  CrewnetDeleteCampOSWorkplaceCategories,
  CrewnetDeleteWorkplaceCategories,
  CrewnetGetWorkplaceCategoryMembers,
  CrewnetImportWorkplaces,
  CrewnetSyncMemberContactInfo,
  EventGetAll,
  GroupCreateCommand,
  UserCreateCommand,
  WorkplaceCategoriesGetCommand,
  WorkplaceCreateCommand,
  ConvertCsvImages,
  WorkplacesGetCommand,
  CrewnetNonCamposUsers,
  CrewnetBulkDelete,
} from './cli/all.command';
import { CrewnetModule } from './crewnet/crewnet.module';
import { ConfigModule } from '@nestjs/config';
import { CamposModule } from './campos/campos.module';
import { XslxService } from './crewnet/xslx.service';
import { ExcelJSService } from './exceljs.service';
import { CSVService } from './csv.service';

@Module({
  imports: [
    CrewnetModule,
    CamposModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],

  providers: [
    CamposMembersInUnit,
    CamposSyncWorkplaceCategoriesAuto,
    CamposSyncWorkplaceCategoryByUnit,
    ConvertCsvImages,
    ConvertSpreadsheetImages,
    CrewnetBulkDelete,
    CrewnetDeleteCampOSWorkplaceCategories,
    CrewnetDeleteWorkplaceCategories,
    CrewnetGetWorkplaceCategoryMembers,
    CrewnetImportWorkplaces,
    CrewnetNonCamposUsers,
    CrewnetSyncMemberContactInfo,
    CSVService,
    EventGetAll,
    ExcelJSService,
    GroupCreateCommand,
    Logger,
    UserCreateCommand,
    WorkplaceCategoriesGetCommand,
    WorkplaceCreateCommand,
    WorkplacesGetCommand,
    XslxService,
  ],
})
export class CliModule {}
