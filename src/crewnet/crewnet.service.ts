import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CrewnetService {
  apiBase = 'https://api.crewnet.dk/v1';

  constructor(private httpService: HttpService) {}

  async userCreate(name: string): Promise<void> {
    const data = await lastValueFrom(
      this.httpService.get(`${this.apiBase}/events`),
    );
    console.log(data.data);

    return;
  }
  async workplaceCreate(name: string): Promise<void> {
    const postData = {
      name,
      workplace_category_id: null,
      allow_create_happening: true,
      allow_comment: true,
    };

    const data = await lastValueFrom(
      this.httpService.post(`${this.apiBase}/workplaces`, postData),
    );
    console.log(data);

    return;
  }

  async groupCreate(name: string): Promise<void> {
    const postData = {
      name,
    };

    const data = await lastValueFrom(
      this.httpService.post(`${this.apiBase}/groups`, postData),
    );
    console.log(data);

    return;
  }
}
