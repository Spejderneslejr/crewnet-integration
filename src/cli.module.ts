import { Logger, Module } from '@nestjs/common';
import {
  EventGetAll,
  GroupCreateCommand,
  UserCreateCommand,
  WorkplaceCreateCommand,
  WorkplacesGetCommand,
} from './cli/all.command';
import { CrewnetModule } from './crewnet/crewnet.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [CrewnetModule, ConfigModule.forRoot({ isGlobal: true })],

  providers: [
    UserCreateCommand,
    WorkplaceCreateCommand,
    GroupCreateCommand,
    EventGetAll,
    WorkplacesGetCommand,
  ],
})
export class CliModule {}
