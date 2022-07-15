import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as Jimp from 'jimp';
import { DateTime } from 'luxon';
import { Command, CommandRunner, Option } from 'nest-commander';
import { CamposService, GuestHelper } from '../campos/campos.service';
import { CliUtilsService } from '../cliutils';
import {
  CrewnetService,
  SyncWorkplaceCategory,
} from '../crewnet/crewnet.service';
import { PDFService } from '../crewnet/pdf.service';
import { XslxService } from '../crewnet/xslx.service';
import { CSVService } from '../csv.service';
import {
  ExcelJSService,
  LicenseImageStatus,
  MemberLicenseData,
} from '../exceljs.service';
import sanitize = require('sanitize-filename');
import { toHexStringOfMinLength } from 'pdf-lib';

@Command({
  name: 'event:getAll',
})
export class EventGetAll implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private crewnet: CrewnetService,
  ) {}

  async run(_inputs: string[], _options: Record<string, any>): Promise<void> {
    const events = await this.crewnet.eventsGet();
    for (const event of events) {
      this.logger.log('Got response', event);
    }

    return;
  }
}

@Command({
  name: 'workplaces:get',
  arguments: '[eventid]',
})
export class WorkplacesGetCommand implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private crewnet: CrewnetService,
  ) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    const workplaces = await this.crewnet.workplacesGet(inputs[0]);
    for (const workplace of workplaces) {
      this.logger.log('Got workplace', workplace);
    }
    return;
  }
}

@Command({
  name: 'workplace:create',
  arguments: '[name]',
})
export class WorkplaceCreateCommand implements CommandRunner {
  constructor(private crewnet: CrewnetService) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      await this.crewnet.workplaceCreate(inputs[0]);
    } catch (error) {
      console.error(error);
    }

    return;
  }
}

@Command({
  name: 'group:create',
  arguments: '[name]',
})
export class GroupCreateCommand implements CommandRunner {
  constructor(private crewnet: CrewnetService) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      await this.crewnet.groupCreate(inputs[0]);
    } catch (error) {
      console.error(error);
    }

    return;
  }
}

@Command({
  name: 'campos:membersInUnit',
  arguments: '[unitId]',
})
export class CamposMembersInUnit implements CommandRunner {
  constructor(private readonly logger: Logger, private campos: CamposService) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      const unitId = parseInt(inputs[0]);
      if (isNaN(unitId)) {
        throw new Error('Invalid unit id option ' + unitId);
      }
      const members = await this.campos.membersByUnit(unitId);
      console.log('Got members for ' + unitId + ': ');
      console.log({ members });
    } catch (error) {
      console.error(error);
    }

    return;
  }
}

@Command({
  name: 'campos:syncGuestHelpers',
  arguments: '',
})
export class SyncGuestHelpers implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private campos: CamposService,
    private crewnet: CrewnetService,
  ) {}

  @Option({
    flags: '--dry-run',
    description: 'Do not create, update or delete',
  })
  parseShell() {
    return true;
  }

  async run(_inputs: string[], options: Record<string, any>): Promise<void> {
    // We've checked organization_id is non-false so state it.
    type AssignedGuestHelper = Omit<GuestHelper, 'organization_id'> & {
      organization_id: number;
    };

    let assignedHelpers: Array<AssignedGuestHelper>;
    const dryRun = options['dryRun'] === true;
    try {
      // Get base data on all helper partners.
      const helpers = await this.campos.getGuestHelperPartners();

      // Filter down to only the partners that has been associated with an
      // organization (should be an Udvalg).
      const before = helpers.length;
      assignedHelpers = helpers.filter((helper) => {
        return (
          typeof helper.organization_id === 'number' &&
          helper.email &&
          helper.firstName &&
          helper.lastName
        );
      }) as AssignedGuestHelper[];

      this.logger.log(
        `Filtered ${before} Guest helpers down to ${assignedHelpers.length} helpers assigned to units`,
      );
    } catch (error) {
      console.error(error);
      throw error;
    }

    if (assignedHelpers.length === 0) {
      this.logger.log('Found no helpers to synchronize');
      return;
    }

    this.logger.log(
      `Got ${assignedHelpers.length} helpers, synchronizing with Crewnet`,
    );

    const crewnetIdToCamposPartnerId =
      await this.campos.getCrewnetIdToCamposPartnerId();

    // Sync the helpers to crewnet - aka, ensure their users exists.
    // This method gives us a list of crewnet users back that has either been
    // looked up or created.
    const crewnetGuestHelpers = await this.crewnet.ensureGuestHelperUsers(
      assignedHelpers as Array<AssignedGuestHelper>,
      crewnetIdToCamposPartnerId,
      dryRun,
    );

    // Calculate which workplace categories the helpers are supposed to be in.
    type HelpersInCampOSOrg = {
      campOSOrgId: number;
      camposUserIds: number[];
    };

    // Map from crewnet org id to campos user ids.
    const workplaceCategoriesSync: { [key: number]: HelpersInCampOSOrg } = {};

    // Then make sure the helpers are associated to categories.
    for (const crewnetHelper of crewnetGuestHelpers) {
      if (
        crewnetHelper.campOSOrgId &&
        workplaceCategoriesSync[crewnetHelper.campOSOrgId] === undefined
      ) {
        workplaceCategoriesSync[crewnetHelper.campOSOrgId] = {
          campOSOrgId: crewnetHelper.campOSOrgId,
          camposUserIds: [],
        };
      }

      // Add the user to the category.
      workplaceCategoriesSync[crewnetHelper.campOSOrgId].camposUserIds.push(
        crewnetHelper.crewnetUserId,
      );
    }

    await this.crewnet.syncWorkplaceCategoryGuestHelpers(
      workplaceCategoriesSync,
      dryRun,
    );
  }
}

@Command({
  name: 'workplacesCategories:get',
})
export class WorkplaceCategoriesGetCommand implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private crewnet: CrewnetService,
  ) {}

  async run(_inputs: string[], _options: Record<string, any>): Promise<void> {
    const categories = await this.crewnet.workplaceCategoriesGet();
    for (const category of categories) {
      this.logger.log('Category: ' + category.name);
    }
    return;
  }
}

@Command({
  name: 'crewnet:deleteWorkplaceCategories',
  arguments: '<id>',
})
export class CrewnetDeleteWorkplaceCategories implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private crewnet: CrewnetService,
  ) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      const ids = inputs[0].split(',');

      this.logger.log('Deleting ' + ids.length + ' workplace catagories');
      for (const id of ids) {
        const intParsed = parseInt(id);
        await this.crewnet.workplaceCategoryDelete(intParsed);
      }
    } catch (error) {
      this.logger.error(error);
    }

    return;
  }
}

@Command({
  name: 'crewnet:deleteCampOSWorkplaceCategories',
})
export class CrewnetDeleteCampOSWorkplaceCategories implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private crewnet: CrewnetService,
  ) {}

  async run(_inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      const workplaces = await this.crewnet.workplaceCategoriesGet();

      for (const workplace of workplaces) {
        if (workplace.description.match(/^CampOS org \d+$/) !== null) {
          this.logger.log(`Deleting Workplace Category ${workplace.name}`);
          await this.crewnet.workplaceCategoryDelete(workplace.id);
        }
      }
    } catch (error) {
      this.logger.error(error);
    }

    return;
  }
}

@Command({
  name: 'crewnet:getWorkplaceCategoryMembers',
  arguments: '<workplace_category_id>',
})
export class CrewnetGetWorkplaceCategoryMembers implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private crewnet: CrewnetService,
  ) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      const members = await this.crewnet.workplacesCategoriesUsersGet(
        parseInt(inputs[0]),
      );
      this.logger.log({ members });
    } catch (error) {
      this.logger.error(error);
    }

    return;
  }
}

@Command({
  name: 'crewnet:importWorkplaces',
  arguments: '<xslx>',
})
export class CrewnetImportWorkplaces implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private crewnet: CrewnetService,
    private xlsx: XslxService,
  ) {}

  @Option({
    flags: '--dry-run',
    description: 'Do not create, update or delete',
  })
  parseShell() {
    return true;
  }

  async run(inputs: string[], options: Record<string, any>): Promise<void> {
    try {
      const workplaces = await this.xlsx.readWorkplaceImport(inputs[0]);

      await this.crewnet.importWorkplaces(
        workplaces,
        options['dryRun'] === true,
      );
    } catch (error) {
      this.logger.error(error);
    }

    return;
  }
}

@Command({
  name: 'crewnet:syncWorkplaceCategoriesAuto',
})
export class CamposSyncWorkplaceCategoriesAuto implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private campos: CamposService,
    private crewnet: CrewnetService,
  ) {}

  @Option({
    flags: '--dry-run',
    description: 'Do not create, update or delete',
  })
  parseShell() {
    return true;
  }

  async run(_inputs: string[], options: Record<string, any>): Promise<void> {
    try {
      // Hardcoded to udvalg.
      const units = await this.campos.getUnitByType(8);
      this.logger.log('Got ' + units.length + ' Units');

      const syncCategories: SyncWorkplaceCategory[] = [];

      this.logger.log('Fetching members of units...');
      for (const unit of units) {
        const membersInUnit = await this.campos.membersByUnit(unit.id);

        syncCategories.push({
          name: unit.name,
          camposOrgId: unit.id,
          members: membersInUnit.map((member) => member.partner_id),
        });

        this.logger.log(
          `got ${membersInUnit.length} members of unit ${unit.name} (${unit.id})`,
        );
      }

      const crewnetIdToCamposPartnerId =
        await this.campos.getCrewnetIdToCamposPartnerId();

      await this.crewnet.addMembersToWorkplaceCategories(
        syncCategories,
        crewnetIdToCamposPartnerId,
        true,
        options['dryRun'] === true,
      );
      this.logger.log('Done');
    } catch (error) {
      console.error(error);
    }

    return;
  }
}

@Command({
  name: 'crewnet:syncWorkplaceCategoryByUnit',
  arguments: '<unitId>',
})
export class CamposSyncWorkplaceCategoryByUnit implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private campos: CamposService,
    private crewnet: CrewnetService,
  ) {}

  @Option({
    flags: '--dry-run',
    description: 'Do not create, update or delete',
  })
  parseShell() {
    return true;
  }

  async run(inputs: string[], options: Record<string, any>): Promise<void> {
    try {
      // Hardcoded to udvalg.
      const unitId = parseInt(inputs[0]);
      if (unitId === NaN) {
        this.logger.error(
          'Could not parse argument ' + inputs[0] + ' as number',
        );
        return;
      }
      const units = await this.campos.getUnit(unitId);
      this.logger.debug({ units });
      if (units.length !== 1) {
        this.logger.error('Could not fetch a single unit for id ' + unitId);
        return;
      }
      const unit = units[0];

      const membersInUnit = await this.campos.membersByUnit(unitId);
      const crewnetIdToCamposPartnerId =
        await this.campos.getCrewnetIdToCamposPartnerId();

      const syncCategories = [
        {
          name: unit.name,
          camposOrgId: unit.id,
          members: membersInUnit.map((member) => member.partner_id),
        },
      ];

      this.logger.log(
        `got ${membersInUnit.length} members of unit ${unit.name} (${unit.id})`,
      );

      await this.crewnet.addMembersToWorkplaceCategories(
        syncCategories,
        crewnetIdToCamposPartnerId,
        true,
        options['dryRun'] === true,
      );
      this.logger.log('Done');
    } catch (error) {
      console.error(error);
    }

    return;
  }
}

@Command({
  name: 'crewnet:syncMemberContactInfo',
})
export class CrewnetSyncMemberContactInfo implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private campos: CamposService,
    private crewnet: CrewnetService,
  ) {}

  @Option({
    flags: '--dry-run',
    description: 'Do not create, update or delete',
  })
  parseShell() {
    return true;
  }

  async run(_inputs: string[], options: Record<string, any>): Promise<void> {
    try {
      const memberData = await this.campos.memberWithCrewnetIdData();

      const syncData = memberData.map((member) => {
        return {
          crewnetUserId: member.crewnet_user,
          mobileNumber: member.mobile || null,
          email: member.email || null,
          // We trust campos and crewnet to have yyyy-mm-dd dates
          birthdate: member.birthdate_date || null,
        };
      });

      this.logger.log('Got ' + memberData.length + ' Units');

      await this.crewnet.syncMemberData(syncData, options['dryRun'] === true);
    } catch (error) {
      console.error(error);
    }

    return;
  }
}
@Command({
  name: 'general:convertSpreadsheetImages',
  arguments: '<path>',
})
export class ConvertSpreadsheetImages implements CommandRunner {
  constructor(private readonly logger: Logger, private excel: ExcelJSService) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      const path = inputs[0];
      await this.excel.convertSpreadsheet(path);

      this.logger.log('Done');
    } catch (error) {
      console.error(error);
    }

    return;
  }
}
@Command({
  name: 'general:convertCsvImages',
  arguments: '<path> <output>',
})
export class ConvertCsvImages implements CommandRunner {
  constructor(private readonly logger: Logger, private csv: CSVService) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      const path = inputs[0];
      const outputDir = inputs[1];
      const records = await this.csv.loadImageCsv(path);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }

      let i = 0;
      for (const record of records.data) {
        this.logger.log(i);
        this.logger.log({ image: record.image });
        if (record.image) {
          this.logger.log('writing ' + i + '.jpeg');
          fs.writeFile(
            outputDir + '/' + i + '.jpeg',
            record.image.base64Data,
            'base64',
            function (err) {
              console.log({ err });
            },
          );
          i++;
        }
      }

      this.logger.log('Done');
    } catch (error) {
      console.error({ error });
    }

    return;
  }
}

@Command({
  name: 'general:generateLicenseSheet',
  arguments: '<path>',
})
export class GenerateLicenseSheet implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private excel: ExcelJSService,
    private campos: CamposService,
    private utils: CliUtilsService,
  ) {}

  MIN_IMAGE_SIZE = 201 * 201;

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    const path = inputs[0];
    const runBasename = DateTime.now().toFormat('yyyyMMddHHmmss');
    const outputDir = `output/license-export-${runBasename}`;
    const outputSheetPath = `${outputDir}/license-export-${runBasename}.xlsx`;

    const DRIVING_LICENSE_GROUP_ID = 59;
    try {
      // Get the users we're going to fetch.
      const inputData = await this.excel.getLicenseInput(path);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }

      type sheetRow = {
        memberNumber: string;
        inputName: string;
        email: string;
        camposName: string;
        area: string;
        department: string;
        licenses: string;
        imageStatus: LicenseImageStatus;
      };

      const outputMemberData: Array<sheetRow> = [];
      // Fetch more data (and the image) for each.
      for (let i = 0; i < inputData.length; i++) {
        const inputMemberData = inputData[i];
        let memberData;
        try {
          memberData = await this.campos.memberByMemberNumber(
            inputMemberData.memberNumber,
          );
        } catch (error) {
          continue;
        }

        const competences = await this.campos.getMemberCompetences(
          memberData.partner_id,
        );

        const drivingLicense = competences
          .filter(
            (competence) =>
              competence.competence_group_id === DRIVING_LICENSE_GROUP_ID,
          )
          .map(
            (drivingLicense) =>
              `${drivingLicense.competence_type_name} (${drivingLicense.competence_type_id})`,
          )
          .join('\r\n');

        let imageStatus: LicenseImageStatus = 'OK';
        // Write the image.
        if (!memberData.image || memberData.image.length === 0) {
          imageStatus = 'MANGLER';
          fs.closeSync(
            fs.openSync(
              `${outputDir}/${memberData.member_number}_IMAGE_MISSING`,
              'w',
            ),
          );
        } else {
          try {
            const buffer = Buffer.from(memberData.image, 'base64');
            const image = await Jimp.read(buffer);

            if (image.getWidth() > image.getHeight()) {
              // We assume we can fix the image by rotating it clockwise.
              // this.logger.log('Rotating: ' + memberData.member_number);
              // await image.rotate(90 * 3);
            }
            // (image.bitmap as any).exifBuffer = undefined;

            // Detect to small images.
            if (image.getWidth() * image.getHeight() < this.MIN_IMAGE_SIZE) {
              imageStatus = 'LILLE BILLEDE';
            }

            memberData.image = (
              await image.getBufferAsync(Jimp.MIME_JPEG)
            ).toString('base64');

            await this.utils.writeImage(
              memberData.image,
              outputDir,
              memberData.member_number,
            );
          } catch (e) {
            this.logger.error(
              `Unable to write image for ${memberData.name}: ${e.message}`,
              e.stack,
            );
          }
        }

        this.logger.log(
          `Processed ${i + 1}/${inputData.length} ${memberData.member_number}`,
        );
        outputMemberData.push({
          memberNumber: memberData.member_number,
          inputName: inputMemberData.name,
          camposName: memberData.name,
          email: memberData.email,
          area: inputMemberData.area,
          department: inputMemberData.department,
          licenses: drivingLicense,
          imageStatus,
        });
      }

      const columns = [
        { header: 'Medlemsnummer', key: 'memberNumber', width: 15 },
        { header: 'Navn', key: 'inputName', width: 30 },
        { header: 'Fuldt navn', key: 'camposName', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Område', key: 'area', width: 10 },
        { header: 'Udvalg', key: 'department', width: 30 },
        {
          header: 'Kørekort kategorier',
          key: 'licenses',
          width: 25,
          style: { alignment: { wrapText: true } },
        },
        { header: 'Billede', key: 'imageStatus', width: 15 },
      ];
      this.logger.log(`Writing ${outputSheetPath}`);
      await this.excel.writeObject(columns, outputMemberData, outputSheetPath);
    } catch (error) {
      this.logger.error(error, error.stack);
    }

    return;
  }
}

@Command({
  name: 'general:generateLicensePdf',
  arguments: '<template> <inputfile> <imgpath>',
})
export class GenerateLicensePdf implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private excel: ExcelJSService,
    private utils: CliUtilsService,
    private pdf: PDFService,
  ) {}

  licenseTypeMap = {
    'EU bevis til bus (65)': { cat: 'cat_eu_bus', ignore: false },
    'EU bevis til lastbil (64)': { cat: 'cat_eu_last', ignore: false },
    'Kørekort A1, A2 (3)': { cat: '', ignore: true },
    'Kørekort AM (2)': { cat: '', ignore: true },
    'Kørekort B (4)': { cat: 'cat_b', ignore: false },
    // Currently missing from template
    //    'Kørekort B1': { cat: 'cat_b1', other: null, ignore: false },
    'Kørekort BE (66)': { cat: 'cat_be', ignore: false },
    'Kørekort C (6)': { cat: 'cat_c', ignore: false },
    'Kørekort C1 (5)': { cat: 'cat_c1', ignore: false },
    'Kørekort CE (67)': { cat: 'cat_ce', ignore: false },
    'Kørekort D1 (7)': { cat: 'cat_d1', ignore: false },
    // Beware of the bug below.
    'Kørekort D1 (8)': { cat: 'cat_d', ignore: false },
    'Kørekort DE (68)': { cat: 'cat_de', ignore: false },
    'Kørekort LK (1)': { cat: 'cat_lk', ignore: false },
    'Krancertifikat (12)': { cat: 'cat_kran', ignore: false },
    'Liftcertifikat (13)': { cat: 'cat_lift', ignore: false },
    'Teleskoplæsser certifikat (63)': { cat: 'cat_teleskop', ignore: false },
    'Truckcertifikat A (10)': { cat: 'cat_truck_a', ignore: false },
    'Truckcertifikat B (11)': { cat: 'cat_truck_b', ignore: false },
  };

  mapLicenses(memberData: MemberLicenseData): {
    cat_b: boolean;
    cat_b1: boolean;
    cat_be: boolean;
    cat_c: boolean;
    cat_c1: boolean;
    cat_ce: boolean;
    cat_d: boolean;
    cat_d1: boolean;
    cat_de: boolean;
    cat_eu_bus: boolean;
    cat_eu_last: boolean;
    cat_truck_a: boolean;
    cat_truck_b: boolean;
    cat_kran: boolean;
    cat_lift: boolean;
    cat_teleskop: boolean;
  } {
    const returnData = {
      cat_b: false,
      cat_b1: false,
      cat_be: false,
      cat_c: false,
      cat_c1: false,
      cat_ce: false,
      cat_d: false,
      cat_d1: false,
      cat_de: false,
      cat_eu_bus: false,
      cat_eu_last: false,
      cat_truck_a: false,
      cat_truck_b: false,
      cat_kran: false,
      cat_lift: false,
      cat_teleskop: false,
    };

    for (const license of memberData.licenses) {
      const typeData = this.licenseTypeMap[license];
      if (typeData === undefined) {
        throw new Error(`Unable to look up license type ${license}`);
      }
      if (typeData.ignore) {
        continue;
      }

      if (typeData.cat !== null) {
        returnData[typeData.cat] = true;
      }
    }
    return returnData;
  }

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    const pdfTemplate = inputs[0];
    const inputFile = inputs[1];
    const imagePath = inputs[2];
    const runBasename = DateTime.now().toFormat('yyyyMMddHHmmss');
    const outputDir = `output/license-export-pdf-${runBasename}`;
    try {
      // Get the users we're going to fetch.
      // TODO - switch to medlemsnummer.
      const inputData = await await this.excel.getFullLicenseInput(inputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }

      // Fetch more data (and the image) for each.
      for (const inputMemberData of inputData) {
        let image;
        if (inputMemberData.imageStatus === 'MANGLER') {
          image = null;
        } else {
          const imageFileName =
            imagePath + '/' + inputMemberData.memberNumber + '.jpg';
          if (!fs.existsSync(imageFileName)) {
            throw new Error('Could not find file ' + imageFileName);
          }
          image = fs.readFileSync(imageFileName, { encoding: 'base64' });
        }

        const licenseData = this.mapLicenses(inputMemberData);
        const fieldData = {
          department: inputMemberData.department,
          area: inputMemberData.area,
          name: inputMemberData.camposName,
          image,
          ...licenseData,
        };

        const nameFilenamePart = sanitize(inputMemberData.camposName)
          .toLocaleLowerCase()
          .replace(/ /g, '_');
        const outputPath =
          outputDir +
          '/' +
          nameFilenamePart +
          '-' +
          inputMemberData.memberNumber +
          '.pdf';
        await this.pdf.generateDriversLicense(
          pdfTemplate,
          fieldData,
          outputPath,
        );
      }
    } catch (error) {
      this.logger.error(error, error.stack);
    }

    return;
  }
}

@Command({
  name: 'crewnet:nonCamposUsers',
  arguments: '<output>',
})
export class CrewnetNonCamposUsers implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private crewnet: CrewnetService,
    private campos: CamposService,
    private excel: ExcelJSService,
  ) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      const path = inputs[0];
      this.logger.log('Fetching Crewnet users');
      const users = await this.crewnet.usersGet();

      const matcher = /^(?<camposId>\d)+@crewnet.sl2022.dk$/;

      this.logger.log('Fetching linked user ids');
      const camposUsers = await this.campos.memberWithCrewnetIdData();

      const linkedUserIds = camposUsers.map((member) => member.crewnet_user);

      const nonUsersRows = [];
      for (const user of users) {
        if (!user.email) {
          this.logger.error('User is missing email');
          this.logger.error({ user });
          continue;
        }

        if (user.email.match(matcher) !== null) {
          continue;
        }

        if (linkedUserIds.includes(user.id)) {
          this.logger.log(user.id + 'linked');
          continue;
        }

        nonUsersRows.push({
          id: user.id,
          user_link: 'https://sl2022.crewnet.dk/users/' + user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        });
      }

      const columns = [
        { header: 'Id', key: 'id', width: 10 },
        { header: 'Fornavn', key: 'first_name', width: 10 },
        { header: 'Efternavn', key: 'last_name', width: 10 },
        { header: 'Email', key: 'email', width: 10 },
        { header: 'Link', key: 'user_link', width: 32 },
      ];
      await this.excel.writeObject(columns, nonUsersRows, path);
    } catch (error) {
      this.logger.error(error);
    }

    return;
  }
}

@Command({
  name: 'crewnet:bulkDelete',
  arguments: '<path>',
})
export class CrewnetBulkDelete implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private crewnet: CrewnetService,
  ) {}

  @Option({
    flags: '--dry-run',
    description: 'Do not create, update or delete',
  })
  parseShell() {
    return true;
  }

  async run(inputs: string[], options: Record<string, any>): Promise<void> {
    try {
      const path = inputs[0];
      if (!fs.existsSync(path)) {
        this.logger.error('Could not find ' + path);
        return;
      }
      const rawData = fs.readFileSync(path, 'utf8');
      const requestedIds = JSON.parse(rawData);

      if (!Array.isArray(requestedIds)) {
        this.logger.error('Could not parse array from ' + path);
        return;
      }

      this.logger.log('Loading existing users');
      const users = await this.crewnet.usersGet();

      const usersToDelete = [];
      for (const user of users) {
        if (requestedIds.includes(user.id)) {
          usersToDelete.push(user.id);
        }
      }

      if (usersToDelete.length === 0) {
        this.logger.log('No users to delete');
        return;
      }

      this.logger.log(`found ${usersToDelete.length} users to delete`);
      if (options['dryRun'] === true) {
        this.logger.log('(Dry run)');
        return;
      }

      for (const id of usersToDelete) {
        this.logger.log(`Deleting ${id}`);
        await this.crewnet.userDelete(id);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    } catch (error) {
      console.error(error);
    }

    return;
  }
}
