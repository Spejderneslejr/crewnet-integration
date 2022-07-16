import { Logger, Module } from '@nestjs/common';
import { CampCtlModule } from '../campctl/campctl.module';
import { EndpointsController } from './endpoints.controller';

/**
 * Provides endpoints required for Drupal to authenticate and identify an
 * user.
 */
@Module({
  imports: [CampCtlModule],
  providers: [Logger],
  controllers: [EndpointsController],
})
export class EndpointsModule {}
