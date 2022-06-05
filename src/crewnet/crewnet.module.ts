import { HttpModule } from '@nestjs/axios';
import { Logger, Module } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { CrewnetService } from './crewnet.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        headers: { Authorization: `Bearer ${configService.get('token')}` },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CrewnetService, Logger, ConfigService],
  exports: [CrewnetService],
})
export class CrewnetModule {}
