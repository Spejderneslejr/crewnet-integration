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
  GenerateLicenseSheet,
  GenerateLicensePdf,
} from './cli/all.command';
import { CrewnetModule } from './crewnet/crewnet.module';
import { ConfigModule } from '@nestjs/config';
import { CamposModule } from './campos/campos.module';
import { XslxService } from './crewnet/xslx.service';
import { ExcelJSService } from './exceljs.service';
import { CSVService } from './csv.service';
import { CliUtilsService } from './cliutils';
import { JimpService } from './crewnet/jimp.service';
import { PDFService } from './crewnet/pdf.service';

@Module({
  imports: [
    CrewnetModule,
    CamposModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],

  providers: [
    GenerateLicensePdf,
    PDFService,
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
    JimpService,
    CliUtilsService,
    ExcelJSService,
    GenerateLicenseSheet,
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
