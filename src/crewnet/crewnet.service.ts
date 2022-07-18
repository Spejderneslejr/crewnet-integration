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

type CamposUser = {
  crewnetUserId: number;
  mobileNumber: string | null;
  email: string;
  birthdate: string;
};

@Injectable()
export class CrewnetService {
  apiBase: string;
  usersWithDuplicatedEmail: number[] = [];
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

    // Comma-separated list of user-ids know to have issues with duplicated emails.
    const duplicatedConfig = this.configService.get('duplicatedEmailUsers');
    if (duplicatedConfig) {
      this.usersWithDuplicatedEmail = duplicatedConfig
        .split(',')
        .map((id) => Number.parseInt(id));
    }
  }

  cleanCamposEmailForCrewnet(user: CamposUser): string {
    if (!user.email) {
      return '';
    }
    let cleaned = user.email.trim().toLocaleLowerCase();

    const matcher = /^(.*)@(hotmail\.com|hotmail\.dk  |gmail\.com)$/;

    if (this.usersWithDuplicatedEmail.includes(user.crewnetUserId)) {
      // This is a user we know already has its email registered, so if possible
      // we want to modify the email to be unique.
      // The strategy is to spot email-providers we know support +-mails and
      // inject a +crewnet-sl2022 at the end of the user-part of the address.
      const match = cleaned.match(matcher);
      if (match !== null) {
        // go from eg user@hotmail.com to user+crewnet-sl2022@hotmail.com.
        cleaned = match[1] + '+crewnet-sl2022' + '@' + match[2];
      }
    }

    return cleaned;
  }

  async getWorkplaceCategoriesCampOSLookup() {
    const categories = await this.workplaceCategoriesGet();
    // Match eg
    // CampOS org 411
    const matcher = /^CampOS org (?<camposOrgId>[0-9]+)$/;

    const map = categories.reduce<{
      [keys: number]: WorkplaceCategory;
    }>((acc, current) => {
      if (current.description) {
        const matches = current.description.match(matcher);
        if (matches !== null) {
          acc[matches.groups.camposOrgId] = current;
        }
      }
      return acc;
    }, {});

    this.logger.debug({ map });
    this.logger.debug(
      'Mapped workplace categories to ' +
        Object.keys(map).length +
        ' campos org ids',
    );

    return map;
  }

  private campOSUserMap: { [key: number]: User } = {};
  /**
   * Given a mapping from crewnet user id to campos partner id, generate a new
   * map that maps from a campos partner id to a crewnet user.
   */
  async getCampOSUserMapping(crewnetIdToCamposPartnerId: {
    [key: number]: number;
  }) {
    if (Object.keys(this.campOSUserMap).length > 0) {
      return this.campOSUserMap;
    }

    // Go fetch the list of users.
    this.logger.debug('Fetching user list');
    // Need a cleaner way of getting to event_id.
    const users = await this.usersGet();

    this.campOSUserMap = users.reduce<typeof this.campOSUserMap>(
      (acc, current) => {
        const partnerId = crewnetIdToCamposPartnerId[current.id];
        const matches = current.email.match(/^(\d+)@crewnet.sl2022.dk$/);
        if (partnerId !== undefined) {
          acc[partnerId] = current;
        } else if (matches !== null) {
          // Fall back to email lookup.
          acc[matches[1]] = current;
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
    try {
      const data = await lastValueFrom(
        this.httpService.put(`${this.apiBase}/users/${userId}`, userData),
      );

      this.logger.debug({ putData: data.data });
    } catch (err) {
      this.logger.error('Error while updating user ' + userId + ': ');
      this.logger.error(err.response.data);
    }

    return;
  }

  async userCreate(postData: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    birthday: string | null;
    address: string | null;
    zip: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    no_phone: boolean | null;
  }): Promise<number> {
    const data = await lastValueFrom(
      this.httpService.post(`${this.apiBase}/users`, postData),
    );
    const userId = data.data.id as number;

    return userId;
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
    this.logger.debug(
      'Fetching users for workplace category ' + workplace_category_id,
    );

    try {
      const data = await lastValueFrom(
        this.httpService.get(
          `${this.apiBase}/workplace_categories/${workplace_category_id}/users`,
        ),
      );

      return data.data;
    } catch (error) {
      this.logger.error(
        'Error while looking up workplace category ' + workplace_category_id,
        error,
      );
      this.logger.error({ error });
      throw error;
    }
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
    crewnetIdToCamposPartnerId: { [key: number]: number },
    dryRun: boolean,
  ): Promise<void> {
    const userMap = await this.getCampOSUserMapping(crewnetIdToCamposPartnerId);

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
          this.logger.debug(
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

  async addMembersToWorkplaceCategories(
    syncCategories: SyncWorkplaceCategory[],
    crewnetIdToCamposPartnerId: { [key: number]: number },
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
    await this.syncWorkplaceCategoryMembers(
      syncCategories,
      crewnetIdToCamposPartnerId,
      dryRun,
    );

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

  async syncMemberData(camposUsers: CamposUser[], dryRun: boolean) {
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
    // const emailSyncList = [28846];
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
        birthday: camposUser.birthdate,
        address: currentCrewnetUser.address,
        zip: currentCrewnetUser.zip,
        city: currentCrewnetUser.city,
        country: currentCrewnetUser.country,
        phone: currentCrewnetUser.phone,
        // We always assume the phone-number is validated so we set no_phone
        // to disable verification.
        no_phone: true,
      };

      const changed: string[] = [];

      camposUser.email = this.cleanCamposEmailForCrewnet(camposUser);

      if (
        camposUser.email !== '' &&
        camposUser.email !== updatedCrewnetUser.email
      ) {
        updatedCrewnetUser.email = camposUser.email;
        changed.push('email');
      }

      if (
        updatedCrewnetUser.phone !== camposUser.mobileNumber &&
        !(camposUser.mobileNumber === null && updatedCrewnetUser.phone === '')
      ) {
        if (camposUser.mobileNumber) {
          updatedCrewnetUser.phone = camposUser.mobileNumber;
        } else {
          updatedCrewnetUser.phone = '';
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

  async syncWorkplaceCategoryGuestHelpers(
    workplaceCategoriesSync: {
      [key: number]: { campOSOrgId: number; camposUserIds: number[] };
    },
    dryRun = false,
  ) {
    const camposOrgIds = Object.keys(
      workplaceCategoriesSync,
    ) as unknown as Array<keyof typeof workplaceCategoriesSync>;

    this.logger.debug('Processing campos org ids ' + camposOrgIds.join(', '));
    const workplaceCategoriesLookup =
      await this.getWorkplaceCategoriesCampOSLookup();

    for (const orgIdToSync of camposOrgIds) {
      const syncCategory = workplaceCategoriesSync[orgIdToSync];
      const workplaceCategory = workplaceCategoriesLookup[orgIdToSync];
      if (workplaceCategory === undefined) {
        throw new Error(
          `Was not able to look up workplace category for campos org id ${orgIdToSync}`,
        );
      }
      const currentMembers = await this.workplacesCategoriesUsersGet(
        workplaceCategory.id,
      );

      const currentMemberIds = currentMembers.reduce((acc, current) => {
        acc.push(current.id);
        return acc;
      }, [] as number[]);

      // Verify that the campos user we're looking at is not already in the
      // workplace category
      for (const member of syncCategory.camposUserIds) {
        if (!currentMemberIds.includes(member)) {
          this.logger.log(
            `Adding crewnet user ${member} to category ${workplaceCategory.name} (${workplaceCategory.id})`,
          );
          if (dryRun) {
            this.logger.log('(dry run, not adding)');
          } else {
            await this.workplaceCategoryApply(member, workplaceCategory.id);
          }
        } else {
          this.logger.debug('Skipping existing correctly placed ' + member);
        }
      }
    }
    return;
  }

  async ensureGuestHelperUsers(
    camposHelpersList: Array<{
      fullName: string;
      firstName: string;
      lastName: string;
      partner_id: number;
      birthdate: string | null;
      email: string;
      mobile: string;
      organization_id: number;
      organization_name: string;
    }>,
    crewnetIdToCamposPartnerId: { [key: number]: number },
    dryRun = true,
  ): Promise<
    Array<{
      campOSOrgId: number;
      campOSPartnerId: number;
      crewnetUserId: number;
      created: boolean;
      existing: boolean;
    }>
  > {
    // Get a a list of members that has an <id>@crewnet.sl2022.dk address
    // This should include all GuestHelpers as we don't allow them to change
    // their email.
    const crewnetUsersLookup = await this.getCampOSUserMapping(
      crewnetIdToCamposPartnerId,
    );

    const crewnetUsers = Object.values(crewnetUsersLookup);
    // List of all crewnet id's campos know of.
    // const existingCrewnetUserIds = Object.keys(crewnetIdToCamposPartnerId);

    const returnList: Awaited<ReturnType<typeof this.ensureGuestHelperUsers>> =
      [];
    // Then go looking for missing users.
    this.logger.debug({ camposHelpersList });
    const needsCreate: typeof camposHelpersList = [];
    // TODO - we could also update the user if something has changed..
    for (const helper of camposHelpersList) {
      const lookup = crewnetUsers.find((crewnetUser) => {
        return (
          // Find user on partner_id prefix in email.
          crewnetUser.id === helper.partner_id ||
          // Find user on match of full name - this should catch the situation
          // where campos has not yet discovered a newly created crewnet user
          // with a partner_id prefix.
          (crewnetUser.first_name === '(GH) ' + helper.firstName &&
            crewnetUser.last_name === helper.lastName) ||
          // Find user on name match without (GH) - this catches the situation
          // where the user already exists.
          (crewnetUser.first_name === helper.firstName &&
            crewnetUser.last_name === helper.lastName)
        );
      });
      if (lookup === undefined) {
        this.logger.log(
          `Want to create ${helper.fullName} (${helper.partner_id})`,
        );
        needsCreate.push(helper);
        continue;
      } else {
        // User does not need to be created, just return the data about the user.
        returnList.push({
          campOSOrgId: helper.organization_id,
          campOSPartnerId: helper.partner_id,
          crewnetUserId: lookup.id,
          created: false,
          existing: true,
        });
      }
    }

    this.logger.log(`Want to create ${needsCreate.length} users`);

    for (const user of needsCreate) {
      const createUserData = {
        first_name: '(GH) ' + user.firstName,
        last_name: user.lastName,
        email: user.partner_id + '@crewnet.sl2022.dk',
        birthday: user.birthdate || '1922-01-01',
        address: null,
        zip: null,
        city: null,
        country: 'DK',
        phone: user.mobile || null,
        no_phone: user.mobile === null,
      };

      if (dryRun) {
        this.logger.log(
          `Dry run, not creating user ${createUserData.first_name} ${createUserData.last_name} - ${createUserData.email}`,
        );
        this.logger.debug({ crateUserData: createUserData });
        // No clue what the crewnet user id is.
        returnList.push({
          campOSOrgId: user.organization_id,
          campOSPartnerId: user.partner_id,
          crewnetUserId: -1,
          created: false,
          existing: false,
        });
      } else {
        this.logger.log(
          `Creating user user ${createUserData.first_name} ${createUserData.last_name} - ${createUserData.email}`,
        );
        const userId = await this.userCreate(createUserData);
        returnList.push({
          campOSOrgId: user.organization_id,
          campOSPartnerId: user.partner_id,
          crewnetUserId: userId,
          created: true,
          existing: false,
        });
      }
    }

    return returnList;
  }

  logDiff(a: object, b: object, changed: string[]) {
    for (const property of changed) {
      this.logger.log(`  - ${property}: ${a[property]} => ${b[property]}`);
    }
  }
}
