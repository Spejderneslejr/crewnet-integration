import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { CampCtlService } from './campctl/campctl.service';
import { Interval, DateTime } from 'luxon';

@Injectable()
export class ScheduledTasksService {
  private dryRun = false;
  constructor(
    private readonly logger: Logger,
    private campctl: CampCtlService,
    private configService: ConfigService,
  ) {
    if (configService.get('server_dry_run') === 'true') {
      this.dryRun = true;
    }
  }

  logDuration(job: string, start: DateTime) {
    const end = DateTime.now();
    const seconds = Interval.fromDateTimes(start, end).length('seconds');
    this.logger.log(
      `${job} completed in ${seconds} seconds (start:${start.toLocaleString(
        DateTime.TIME_24_WITH_SECONDS,
      )}, end: ${end.toLocaleString(DateTime.TIME_24_WITH_SECONDS)})`,
    );
  }

  @Cron('10 0,10,20,30,40,50 * * * *')
  async syncWorkplaceCategoriesAuto() {
    const startTime = DateTime.now();
    this.logger.log('Scheduled run of syncWorkplaceCategoriesAuto');
    if (this.dryRun) {
      this.logger.log('Dry run mode');
    }
    await this.campctl.syncWorkplaceCategoriesAuto(this.dryRun);
    this.logDuration('syncWorkplaceCategoriesAuto', startTime);
  }

  // We sync every half hour, assuming most syncs gets picked up during pings.
  @Cron('10 03,33 * * * *')
  async syncGuestHelpers() {
    const startTime = DateTime.now();
    this.logger.log('Scheduled run of syncWorkplaceCategoriesAuto');
    if (this.dryRun) {
      this.logger.log('Dry run mode');
    }
    await this.campctl.syncGuestHelpers(this.dryRun);
    this.logDuration('syncGuestHelpers', startTime);
  }

  @Cron('20 5,15,25,35,45,55 * * * *')
  async syncMemberContactInfo() {
    const startTime = DateTime.now();
    this.logger.log('Scheduled run of syncMemberContactInfo');
    if (this.dryRun) {
      this.logger.log('Dry run mode');
    }
    await this.campctl.syncMemberContactInfo(this.dryRun);
    this.logDuration('syncMemberContactInfo', startTime);
  }
}
