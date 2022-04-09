import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
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
  controllers: [],
  providers: [CrewnetService],
  exports: [CrewnetService],
})
export class CrewnetModule {}
