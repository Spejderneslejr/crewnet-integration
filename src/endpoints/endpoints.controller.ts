import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotAcceptableException,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampCtlService } from '../campctl/campctl.service';

@Controller()
export class EndpointsController {
  dryRun: boolean;
  constructor(
    private readonly logger: Logger,
    private readonly campctl: CampCtlService,
    private configService: ConfigService,
  ) {
    if (configService.get('server_dry_run') === 'true') {
      this.dryRun = true;
    }
  }

  /**
   * Add a route to redirect users back to Drupal in login flow:
   *
   * 1. Drupal redirects to auth provider (B2C)
   * 2. After login auth provider redirects here
   * 3. based on state we find correct site and redirect to is.
   */
  @Get('/guesthelper')
  async getCasRedirect(
    @Query('partner', ParseIntPipe) partnerId: number,
  ): Promise<{ crewnet_user: number }> {
    const syncData = await this.campctl.syncGuestHelpers(this.dryRun, [
      partnerId,
    ]);

    // Syncdata is an array of objects that describes synchronized users.
    // The guesthelper endpoint runs with an include-list of 1, so we should just
    // expect a single result, and that result should have created or existing
    // true.

    // To be on the safe side we filter and verify.
    const singleResult = syncData.filter((syncResult) => {
      return syncResult.campOSPartnerId === partnerId;
    });

    if (singleResult.length === 0) {
      throw new NotAcceptableException(
        'User not found',
        'Could not find partner with id ' +
          partnerId +
          ' that was associated with a Udvalg and had name, email and phone-number',
      );
    } else if (!(singleResult[0].created || singleResult[0].existing)) {
      throw new InternalServerErrorException(
        'Unable to create',
        'Could not create crewnet user for partner id ' + partnerId,
      );
    }
    return { crewnet_user: singleResult[0].crewnetUserId };
  }
}
