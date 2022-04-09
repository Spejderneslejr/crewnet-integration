import { Module } from '@nestjs/common';
import {
  GroupCreateCommand,
  UserCreateCommand,
  WorkplaceCreateCommand,
} from './cli/user.command';
import { CrewnetModule } from './crewnet/crewnet.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [CrewnetModule, ConfigModule.forRoot({ isGlobal: true })],

  providers: [UserCreateCommand, WorkplaceCreateCommand, GroupCreateCommand],
})
export class CliModule {}
