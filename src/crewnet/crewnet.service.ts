import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

export type Event = {
  id: number;
  name: string;
  active: boolean;
  first_date: string;
  last_date: string;
};

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
};

export type WorkplaceCategory = {
  id: number;
  name: string;
  description: string;
  shift_info: string;
  age: number;
};

export type Workplace = {
  id: number;
  name: string;
  workplace_category_id: number;
  age: number;
  allow_create_happening: boolean;
  allow_comment: boolean;
};

export type SyncWorkplaceCategory = {
  // The name of the category.
  name: string;
  camposOrgId: number;
  crewnetWorkplaceCategoryId?: number;
  // _CampOS_ member numbers.
  members: number[];
};

@Injectable()
export class CrewnetService {
  apiBase = 'https://api.crewnet.dk/v1';

  constructor(
    private readonly logger: Logger,
    private httpService: HttpService,
    // TODO: Really should warp this to avoid configs directly.
    private configService: ConfigService,
  ) {
    this.httpService.axiosRef.interceptors.request.use((request) => {
      // this.logger.debug('Starting Request', request);
      return request;
    });

    this.httpService.axiosRef.interceptors.response.use((response) => {
      // this.logger.debug('Response:', JSON.stringify(response.data, null, 2));
      return response;
    });
  }

  private campOSUserMap: { [key: number]: User } = {};

  async getCampOSUserMapping() {
    if (Object.keys(this.campOSUserMap).length > 0) {
      return this.campOSUserMap;
    }

    // Go fetch the list of users.
    this.logger.debug('Fetching user list');
    // Need a cleaner way of getting to event_id.
    const users = await this.get<Array<User>>('users', {
      event_id: this.configService.get('event_id'),
    });

    const matcher = /^(?<camposId>\d)+@crewnet.sl2022.dk$/;
    this.campOSUserMap = users.reduce<typeof this.campOSUserMap>(
      (acc, current) => {
        const found = current.email.match(matcher);
        if (found !== null && found.length > 0) {
          acc[parseInt(found[0])] = current;
        }
        return acc;
      },
      {},
    );
    this.logger.debug(
      'Done, got ' +
        Object.keys(this.campOSUserMap).length +
        ' users out of the original ' +
        users.length,
    );
    return this.campOSUserMap;
  }

  async get<Type>(endpoint: string, params: object = {}): Promise<Type> {
    const response = await lastValueFrom(
      this.httpService.get(`${this.apiBase}/${endpoint}`, { params }),
    );
    return response.data;
  }

  async eventsGet(): Promise<Array<Event>> {
    return this.get<Array<Event>>('events');
  }

  async workplacesGet(event_id: string): Promise<Array<Workplace>> {
    return this.get<Array<Workplace>>('workplaces', { event_id });
  }

  async userCreate(_name: string): Promise<void> {
    const data = await lastValueFrom(
      this.httpService.get(`${this.apiBase}/events`),
    );
    console.log(data.data);

    return;
  }
  async workplaceCreate(
    name: string,
    workplace_category_id: number | null = null,
  ): Promise<{ id: number }> {
    const postData = {
      name,
      workplace_category_id,
      allow_create_happening: true,
      allow_comment: true,
      age: 0,
      helper_needed: 10_000,
    };

    const data = await lastValueFrom(
      this.httpService.post(`${this.apiBase}/workplaces`, postData),
    );
    console.log(data.data);
    const workplaceId = data.data.id;

    const addToEventData = JSON.parse(
      JSON.stringify({
        workplace_id: workplaceId,
        helper_need: 10_000,
      }),
    );
    // TODO: Need a cleaner way of getting to event_id.
    const eventId = this.configService.get('event_id');
    await lastValueFrom(
      this.httpService.post(
        `${this.apiBase}/events/${eventId}/workplaces`,
        addToEventData,
      ),
    );

    return {
      id: workplaceId,
    };
  }

  async groupCreate(name: string): Promise<void> {
    const postData = {
      name,
    };

    const data = await lastValueFrom(
      this.httpService.post(`${this.apiBase}/groups`, postData),
    );
    console.log(data.data);

    return;
  }

  async workplacesCategoriesUsersGet(
    workplace_category_id: number,
  ): Promise<Array<{ id: number; name: string }>> {
    const data = await lastValueFrom(
      this.httpService.get(
        `${this.apiBase}/workplace_categories/${workplace_category_id}/users`,
      ),
    );
    return data.data;
  }

  async workplaceCategoryCreate(
    name: string,
    description: string,
  ): Promise<{ id: number }> {
    const postData = {
      name,
      age: 0,
      description,
    };
    const data = await lastValueFrom(
      this.httpService.post(`${this.apiBase}/workplace_categories`, postData),
    );
    console.log(data.data);

    return {
      id: data.data.id,
    };
  }

  async workplaceCategoryDelete(id: number): Promise<void> {
    this.logger.log('Deleting Workplace Category ' + id);
    const data = await lastValueFrom(
      this.httpService.delete(`${this.apiBase}/workplace_categories/${id}`),
    );
    console.log(data.data);

    return;
  }

  async workplaceCategoryApply(
    userId: number,
    workplaceCategoryId: number,
  ): Promise<void> {
    const postData = JSON.parse(
      JSON.stringify({
        workplace_category_id: workplaceCategoryId,
      }),
    );
    // TODO: Need a cleaner way of getting to event_id.
    const event_id = this.configService.get('event_id');
    await lastValueFrom(
      this.httpService.post(
        `${this.apiBase}/users/${userId}/workplace_categories?event_id=${event_id}`,
        postData,
      ),
    );

    return;
  }

  async workplaceCategoriesGet(): Promise<Array<WorkplaceCategory>> {
    return this.get<Array<WorkplaceCategory>>('workplace_categories');
  }

  /**
   * Ensures a workplace category is in sync with regards to members.
   */
  async syncWorkplaceCategoryMembers(
    syncCategories: SyncWorkplaceCategory[],
    dryRun: boolean,
  ): Promise<void> {
    const userMap = await this.getCampOSUserMapping();

    for (const syncCategory of syncCategories) {
      const currentMembers = await this.workplacesCategoriesUsersGet(
        syncCategory.crewnetWorkplaceCategoryId,
      );

      const currentMemberIds = currentMembers.reduce((acc, current) => {
        acc.push(current.id);
        return acc;
      }, [] as number[]);

      for (const member of syncCategory.members) {
        const crewnetUser = userMap[member];
        if (!crewnetUser) {
          this.logger.error(
            'Could not find crewnet user for campos user ' +
              member +
              ', skipping',
          );
          continue;
        }
        if (!syncCategory.crewnetWorkplaceCategoryId) {
          this.logger.error(
            'Could not determine crewnet workplace category for campos user ' +
              member +
              ' assigned to org ' +
              syncCategory.camposOrgId +
              ', skipping',
          );
          continue;
        }

        const userData =
          crewnetUser.id +
          ' (' +
          crewnetUser.email +
          ') to category ' +
          syncCategory.name +
          '(' +
          syncCategory.crewnetWorkplaceCategoryId +
          ')';

        if (!currentMemberIds.includes(crewnetUser.id)) {
          this.logger.log('Adding crewnet user ' + userData);
          if (dryRun) {
            this.logger.log('(dry run, not adding)');
          } else {
            await this.workplaceCategoryApply(
              crewnetUser.id,
              syncCategory.crewnetWorkplaceCategoryId,
            );
          }
        } else {
          this.logger.debug('Skipping existing correctly placed ' + userData);
        }
      }
    }
    return;
  }

  async syncWorkplaceCategory(
    syncCategories: SyncWorkplaceCategory[],
    syncMembers = true,
    dryRun = false,
  ): Promise<void> {
    // First ensure all categories exists.
    this.logger.log('Syncing workplace categories');
    if (dryRun) {
      this.logger.log('(Dry run)');
    }

    const existingCategories = await this.workplaceCategoriesGet();
    const existingCategoryByNames = existingCategories.reduce<{
      [keys: string]: WorkplaceCategory;
    }>((acc, current) => {
      acc[current.name] = current;
      return acc;
    }, {});

    for (const [index, syncCategory] of Object.entries(syncCategories)) {
      if (!(syncCategory.name in existingCategoryByNames)) {
        this.logger.log('Creating new category ' + syncCategory.name);
        if (dryRun) {
          this.logger.log('(Dry run, not creating)');
        } else {
          const createData = await this.workplaceCategoryCreate(
            syncCategory.name,
            'CampOS org ' + syncCategory.camposOrgId,
          );
          syncCategories[index].crewnetWorkplaceCategoryId = createData.id;
        }
      } else {
        syncCategories[index].crewnetWorkplaceCategoryId =
          existingCategoryByNames[syncCategory.name].id;
      }
    }

    if (!syncMembers) {
      this.logger.log('Not syncing members');
      return;
    }
    // All categories now exists, now add members.
    await this.syncWorkplaceCategoryMembers(syncCategories, dryRun);

    return;
  }

  async importWorkplaces(
    workplaces: Array<{
      workplaceName: string;
      workplaceCategoryName: string;
    }>,
  ) {
    // TODO: Need a cleaner way of getting to event_id.
    const event_id = this.configService.get('event_id');
    const existingWorkplaces = await this.workplacesGet(event_id);
    const existingWorkplacesByNames = existingWorkplaces.reduce<{
      [keys: string]: Workplace;
    }>((acc, current) => {
      acc[current.name] = current;
      return acc;
    }, {});

    const existingCategories = await this.workplaceCategoriesGet();
    const existingCategoryByNames = existingCategories.reduce<{
      [keys: string]: WorkplaceCategory;
    }>((acc, current) => {
      acc[current.name] = current;
      return acc;
    }, {});

    // Ensure all categories exists.
    for (const workplace of workplaces) {
      if (!(workplace.workplaceCategoryName in existingCategoryByNames)) {
        this.logger.error(
          'Could not look up workplace category ' +
            workplace.workplaceCategoryName +
            ', skipping workplace ' +
            workplace.workplaceName,
        );
        continue;
      }

      if (workplace.workplaceName in existingWorkplacesByNames) {
        this.logger.log(
          'Workplace "' +
            workplace.workplaceName +
            '" already exists, skipping.',
        );
        continue;
      }

      // Category exists and the workplace does not - create.
      await this.workplaceCreate(
        workplace.workplaceName,
        existingCategoryByNames[workplace.workplaceCategoryName].id,
      );
    }
  }
}
