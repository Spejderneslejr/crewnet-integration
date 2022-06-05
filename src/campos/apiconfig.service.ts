import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiconfigService {
  constructor(private configService: ConfigService) {
    // TODO: Validate
  }

  get odooHostname(): string {
    return this.configService.get('odoo_hostname');
  }
  get odooUID(): string {
    return this.configService.get('odoo_uid');
  }
  get odooPassword(): string {
    return this.configService.get('odoo_password');
  }
  get odooDB(): string {
    return this.configService.get('odoo_db');
  }
}
