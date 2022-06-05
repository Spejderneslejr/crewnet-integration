import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { CamposService } from '../campos/campos.service';
import {
  CrewnetService,
  SyncWorkplaceCategory,
} from '../crewnet/crewnet.service';
import { XslxService } from '../crewnet/xslx.service';

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
  name: 'crewnet:syncWorkplaceCategoriesOld',
  arguments: '<xslx>',
})
export class CrewnetSyncWorkplaceCategoriesOld implements CommandRunner {
  constructor(
    private readonly logger: Logger,
    private crewnet: CrewnetService,
    private xlsx: XslxService,
  ) {}

  @Option({
    flags: '--no-users',
    description: 'Dont create users',
  })
  parseShell() {
    return false;
  }

  async run(inputs: string[], options: Record<string, any>): Promise<void> {
    try {
      // Read and parse spreadsheet
      const categoryData = await this.xlsx.readWorkplaceCategories(inputs[0]);

      type Categories = { [key: string]: SyncWorkplaceCategory };

      const categories = categoryData.reduce<Categories>(
        (categories, currentValue) => {
          // Create category skeleton.
          if (!(currentValue.organizationName in categories)) {
            categories[currentValue.organizationName] = {
              name: currentValue.organizationName,
              camposOrgId: currentValue.organizationId,
              members: [],
            };
          }

          if (
            categories[currentValue.organizationName].members.includes(
              currentValue.partnerId,
            )
          ) {
            return categories;
          }

          categories[currentValue.organizationName].members.push(
            currentValue.partnerId,
          );

          return categories;
        },
        {},
      );

      this.logger.log('got entries: ' + categoryData.length);
      this.logger.log('Categories: ' + Object.keys(categories).length);

      await this.crewnet.syncWorkplaceCategory(
        Object.values(categories),
        options.users,
      );
    } catch (error) {
      this.logger.error(error);
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

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      const workplaces = await this.xlsx.readWorkplaceImport(inputs[0]);

      await this.crewnet.importWorkplaces(workplaces);
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
    } catch (error) {
      console.error(error);
    }

    return;
  }
}
