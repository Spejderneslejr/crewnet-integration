import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { CamposService } from '../campos/campos.service';
import {
  CrewnetService,
  SyncWorkplaceCategory,
} from '../crewnet/crewnet.service';
import { XslxService } from '../crewnet/xslx.service';
import { CSVService } from '../csv.service';
import { ExcelJSService } from '../exceljs.service';
import * as fs from 'fs';
import { runInThisContext } from 'vm';

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
  name: 'user:create',
  arguments: '[username]',
})
export class UserCreateCommand implements CommandRunner {
  constructor(private crewnet: CrewnetService) {}

  async run(_inputs: string[], _options: Record<string, any>): Promise<void> {
    await this.crewnet.userCreate('test testesen');
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

      await this.crewnet.syncWorkplaceCategory(
        syncCategories,
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

      await this.crewnet.syncWorkplaceCategory(
        syncCategories,
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
