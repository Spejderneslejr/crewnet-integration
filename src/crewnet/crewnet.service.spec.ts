import { Test, TestingModule } from '@nestjs/testing';
import { CrewnetService } from './crewnet.service';

describe('CrewnetService', () => {
  let service: CrewnetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrewnetService],
    }).compile();

    service = module.get<CrewnetService>(CrewnetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
