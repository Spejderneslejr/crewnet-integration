import { Command, CommandRunner } from 'nest-commander';
import { CrewnetService } from '../crewnet/crewnet.service';

@Command({
  name: 'user:create',
  arguments: '[username]',
})
export class UserCreateCommand implements CommandRunner {
  constructor(private crewnet: CrewnetService) {}

  async run(_inputs: string[], _options: Record<string, any>): Promise<void> {
    await this.crewnet.userCreate('test testesen');
    return;
  }
}

@Command({
  name: 'workplace:create',
  arguments: '[name]',
})
export class WorkplaceCreateCommand implements CommandRunner {
  constructor(private crewnet: CrewnetService) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      await this.crewnet.workplaceCreate(inputs[0]);
    } catch (error) {
      console.error(error);
    }

    return;
  }
}

@Command({
  name: 'group:create',
  arguments: '[name]',
})
export class GroupCreateCommand implements CommandRunner {
  constructor(private crewnet: CrewnetService) {}

  async run(inputs: string[], _options: Record<string, any>): Promise<void> {
    try {
      await this.crewnet.groupCreate(inputs[0]);
    } catch (error) {
      console.error(error);
    }

    return;
  }
}
