import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

export type Event = {
  id: number;
  name: string;
  active: boolean;
  first_date: string;
  last_date: string;
};

export type Workplace = unknown;

@Injectable()
export class CrewnetService {
  apiBase = 'https://api.crewnet.dk/v1';

  constructor(
    private readonly logger: Logger,
    private httpService: HttpService,
  ) {
    this.httpService.axiosRef.interceptors.request.use((request) => {
      this.logger.debug('Starting Request', request);
      return request;
    });

    this.httpService.axiosRef.interceptors.response.use((response) => {
      this.logger.debug('Response:', JSON.stringify(response.data, null, 2));
      return response;
    });
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

  async userCreate(_name: string): Promise<void> {
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
