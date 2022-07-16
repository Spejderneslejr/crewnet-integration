/**
 * This service should ideally be used for orchestration of other services.
 *
 * Eg, when we need to do something with campos/crewnet that can not be expressed
 * as a single invocation of a method on those services.
 */
import { Injectable, Logger } from '@nestjs/common';
import { CamposService, GuestHelper } from '../campos/campos.service';
import {
  CrewnetService,
  SyncWorkplaceCategory,
} from '../crewnet/crewnet.service';

@Injectable()
export class CampCtlService {
  constructor(
    private readonly logger: Logger,
    private campos: CamposService,
    private crewnet: CrewnetService,
  ) {}

  /**
   * Ensure all campos users associated with an udvalg ends up in a crewnet workplace-category
   *
   * @param dryRun Whether to carry out the actions
   */
  async syncWorkplaceCategoriesAuto(dryRun = false) {
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
        dryRun,
      );
      this.logger.log('Done');
    } catch (error) {
      console.error(error);
    }

    return;
  }

  /**
   * Create guest helpers that has been associated with a udvalg and add the
   * user to the corresponding workplace category.
   *
   * @param dryRun Whether to carry out the actions
   * @param includeList Only create/sync specific users
   */
  async syncGuestHelpers(dryRun = false, includeList: number[] = []) {
    if (includeList.length > 0) {
      this.logger.log(
        `Only synchronizing user with partner id ${includeList.join(', ')}`,
      );
    }
    // We've checked organization_id is non-false so state it.
    type AssignedGuestHelper = Omit<GuestHelper, 'organization_id'> & {
      organization_id: number;
    };

    let assignedHelpers: Array<AssignedGuestHelper>;
    try {
      // Get base data on all helper partners.
      const helpers = await this.campos.getGuestHelperPartners();

      // Filter down to only the partners we want:
      // * associated with an organization (should be an Udvalg).
      // * has email, lastname and firstname
      // * If we're running with an include-list - is on the list.
      const before = helpers.length;
      assignedHelpers = helpers.filter((helper) => {
        const include =
          (includeList.length === 0 ||
            includeList.includes(helper.partner_id)) &&
          typeof helper.organization_id === 'number' &&
          helper.email &&
          helper.firstName &&
          helper.lastName;

        // Extra logging for the situation where a helper was explicitly requested
        // to be included but we ignored it.
        if (
          includeList.length > 0 &&
          includeList.includes(helper.partner_id) &&
          !include
        ) {
          this.logger.log(
            'Helper is on include-list, but will be ignored due to missing email/firstname/lastname/org',
          );
          this.logger.log({ helper });
        }

        return include;
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
      return [];
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

    return crewnetGuestHelpers;
  }

  async syncMemberContactInfo(dryRun = false): Promise<void> {
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

      await this.crewnet.syncMemberData(syncData, dryRun);
    } catch (error) {
      console.error(error);
    }

    return;
  }
}
