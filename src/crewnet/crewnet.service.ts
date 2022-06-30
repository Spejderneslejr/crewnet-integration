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
  address: string;
  zip: string;
  city: string;
  country: string;
  phone: string;
  no_phone: boolean;
};

export type UserUpdate = {
  first_name: string;
  last_name: string;
  email: string;
  birthday: string;
  address: string;
  zip: string;
  city: string;
  country: string;
  phone: string;
  no_phone: boolean;
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
  apiBase: string;
  constructor(
    private readonly logger: Logger,
    private httpService: HttpService,
    // TODO: Really should warp this to avoid configs directly.
    private configService: ConfigService,
  ) {
    this.apiBase = 'https://' + this.configService.get('apidomain') + '/v1';

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
    const users = await this.usersGet();

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

  async usersGet(): Promise<Array<User>> {
    const users = await this.get<Array<User>>('users', {
      event_id: this.configService.get('event_id'),
    });

    return users;
  }

  async userUpdate(userId: number, userData: UserUpdate): Promise<void> {
    this.logger.debug(`${this.apiBase}/users/${userId}`);
    this.logger.debug({ userData });
    const data = await lastValueFrom(
      this.httpService.put(`${this.apiBase}/users/${userId}`, userData),
    );

    this.logger.debug({ putData: data.data });

    return;
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

  async userDelete(id: number): Promise<void> {
    const response = await lastValueFrom(
      this.httpService.delete(`${this.apiBase}/users/${id}`),
    );
    this.logger.log({
      status: response.status,
      statusText: response.statusText,
    });

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
    dryRun: boolean,
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
      this.logger.log(
        'Creating workplace ' +
          workplace.workplaceName +
          ' with workplace category ' +
          workplace.workplaceCategoryName +
          '(' +
          existingCategoryByNames[workplace.workplaceCategoryName].id +
          ')',
      );
      if (dryRun) {
        this.logger.log('(dry run)');
      } else {
        await this.workplaceCreate(
          workplace.workplaceName,
          existingCategoryByNames[workplace.workplaceCategoryName].id,
        );
      }
    }
  }

  async syncMemberData(
    camposUsers: {
      crewnetUserId: number;
      mobileNumber: string | null;
      email: string;
      birthdate: string;
    }[],
    dryRun: boolean,
  ) {
    this.logger.log('Considering CampOS ' + camposUsers.length + ' to sync');
    // Fetch the current list of users.
    const crewnetUsers = await this.usersGet();

    this.logger.log('Got ' + crewnetUsers.length + ' existing Crewnet users');

    const currentUsersMap = crewnetUsers.reduce<typeof this.campOSUserMap>(
      (acc, crewnetUser) => {
        acc[crewnetUser.id] = crewnetUser;
        return acc;
      },
      {},
    );

    let updateCount = 0;
    const emailSyncList = [28846];
    for await (const camposUser of camposUsers) {
      if (!currentUsersMap.hasOwnProperty(camposUser.crewnetUserId)) {
        this.logger.log(
          'Skipping user ' +
            camposUser.crewnetUserId +
            ' that is present in CampOS but not CrewNet',
        );
        continue;
      }

      // Drop id from currentUser to get putUser.
      const currentCrewnetUser = currentUsersMap[camposUser.crewnetUserId];

      const updatedCrewnetUser: UserUpdate = {
        first_name: currentCrewnetUser.first_name,
        last_name: currentCrewnetUser.last_name,
        email: currentCrewnetUser.email,
        // We add this in by hand as it does not existing in the current user object.
        // This means that we will currently not update on a an updated birthdate.

        birthday: camposUser.birthdate,
        address: currentCrewnetUser.address,
        zip: currentCrewnetUser.zip,
        city: currentCrewnetUser.city,
        country: currentCrewnetUser.country,
        phone: currentCrewnetUser.phone,
        no_phone: currentCrewnetUser.no_phone,
      };

      const changed: string[] = [];

      // We're not syncing emails for now, but add the email if the user is on the list.
      if (emailSyncList.includes(currentCrewnetUser.id)) {
        if (updatedCrewnetUser.email != camposUser.email) {
          updatedCrewnetUser.email = camposUser.email;
          changed.push('email');
        }
      }

      if (
        updatedCrewnetUser.phone !== camposUser.mobileNumber &&
        !(camposUser.mobileNumber === null && updatedCrewnetUser.phone === '')
      ) {
        if (camposUser.mobileNumber) {
          updatedCrewnetUser.phone = camposUser.mobileNumber;
          if (updatedCrewnetUser.no_phone) {
            updatedCrewnetUser.no_phone = false;
          }
        } else {
          updatedCrewnetUser.phone = '';
          if (!updatedCrewnetUser.no_phone) {
            updatedCrewnetUser.no_phone = true;
          }
        }
        changed.push('phone');

        changed.push('no_phone');
      }

      if (updatedCrewnetUser.birthday != camposUser.birthdate) {
        updatedCrewnetUser.birthday = camposUser.birthdate;
        changed.push('birthday');
      }

      if (changed.length !== 0) {
        updateCount++;
        this.logger.log(
          'User ' +
            currentCrewnetUser.id +
            ' data change detected: ' +
            (dryRun ? '(dry-run)' : ''),
        );
        this.logger.debug({ camposUser });
        this.logger.debug({ currentCrewnetUser });
        this.logger.debug({ updatedCrewnetUser });

        this.logDiff(currentCrewnetUser, updatedCrewnetUser, changed);
        if (!dryRun) {
          try {
            await this.userUpdate(currentCrewnetUser.id, updatedCrewnetUser);
          } catch (error) {
            this.logger.error(
              'Error while updating user ' + currentCrewnetUser.id,
              error,
            );
            this.logger.error({ error });
          }
        }
      } else {
        this.logger.debug(
          'User ' + currentCrewnetUser.id + ' is already in sync',
        );
      }
    }
    this.logger.log(
      'Updated ' + updateCount + ' users' + (dryRun ? ' (dry-run)' : ''),
    );
  }

  logDiff(a: object, b: object, changed: string[]) {
    for (const property of changed) {
      this.logger.log(`  - ${property}: ${a[property]} => ${b[property]}`);
    }
  }
}
