import { Injectable, Logger } from '@nestjs/common';
import { ApiconfigService } from './apiconfig.service';
import * as xmlrpc from 'xmlrpc';

export type UnitResult = {
  id: number;
  name: string;
};

@Injectable()
export class CamposService {
  constructor(private config: ApiconfigService, private logger: Logger) {}

  obj = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      model: 'member.profile',
      domain: [
        ['organization_id', '=', 2],
        ['partner_id.function_ids.organization_id', 'child_of', 381],
        ['state', '=', 'active'],
      ],
      fields: [
        'member_number',
        'name',
        'complete_address',
        'birthdate_date',
        'age',
        'phone_combo',
        'email',
        'organization_id',
        'active_functions_in_profile',
        'state',
      ],
      limit: 80,
      sort: 'state ASC, name ASC',
      context: {
        uid: 1755,
        lang: 'da_DK',
        age: 0,
        tz: 'Europe/Copenhagen',
        team_activities: false,
        active_id: 381,
        default_organization_id: 381,
        active_model: 'member.organization',
        active_ids: [381],
        search_default_state: 'active',
        limit_org_ids: [],
        search_disable_custom_filters: true,
      },
    },
    id: 76376773,
  };

  async membersByUnit(unitId: number) {
    // The typecast here is a bit strange. executeKw declares it returns a string,
    // but it actually returns an object.
    const members = (await this.executeKw('member.profile', 'search_read', [], {
      domain: [
        ['organization_id', '=', 2],
        ['partner_id.function_ids.organization_id', 'child_of', unitId],
        ['state', '=', 'active'],
      ],
      fields: ['member_number', 'crewnet_user', 'partner_id'],
      context: { show_org_path: true, lang: 'da_DK' },
    })) as unknown as Array<{
      member_number: string;
      crewnet_user: number;
      partner_id: any[];
    }>;

    const returnMembers = members.map((member) => {
      return {
        member_number: member.member_number,
        crewnet_user: member.crewnet_user,
        // hard assumption from test-queries
        partner_id: member.partner_id[0] as number,
      };
    });
    this.logger.debug({ returnMembers });

    return returnMembers;
  }

  tbd = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      model: 'member.organization',
      domain: [
        ['belongs_to_company', '=', true],
        ['organization_type_id', '=', 8],
      ],
      fields: [
        'id',
        'name',
        'kanban_type',
        'color',
        'organization_type_id',
        'show_on_dashboard',
        'kanban_dashboard',
        'kanban_dashboard_graph',
      ],
      limit: 80,
      sort: '',
      context: {
        age: 0,
        tz: 'Europe/Copenhagen',
        lang: 'da_DK',
        uid: 1755,
        team_activities: false,
        search_default_dashboard: 1,
      },
    },
    id: 260587245,
  };

  async getUnitByType(level: number): Promise<Array<UnitResult>> {
    // The typecast here is a bit strange. executeKw declares it returns a string,
    // but it actually returns an object.
    const units: Array<any> = (await this.executeKw(
      'member.organization',
      'search_read',
      [],
      {
        domain: [
          ['belongs_to_company', '=', true],
          ['organization_type_id', '=', level],
        ],
        fields: ['id', 'name'],
        context: { lang: 'da_DK' },
      },
    )) as unknown as Array<UnitResult>;

    return units;
  }

  executeKw(
    model: string,
    method: string,
    paramsByPosition: string[] = [],
    paramsByKeyword: unknown = {},
  ): Promise<string> {
    const clientOptions = {
      host: this.config.odooHostname,
      port: 443,
      path: '/xmlrpc/2/object',
    };
    const client = xmlrpc.createSecureClient(clientOptions);

    const fparams = [];
    fparams.push(this.config.odooDB);
    fparams.push(this.config.odooUID);
    fparams.push(this.config.odooPassword);
    fparams.push(model);
    fparams.push(method);
    fparams.push(paramsByPosition);
    fparams.push(paramsByKeyword);

    //this.logger.debug({ fparams });

    return new Promise((resolve, reject) => {
      client.methodCall('execute_kw', fparams, function (error, value) {
        if (error) {
          return reject(error);
        }
        return resolve(value);
      });
    });
  }

  async sqlExport(_name: string): Promise<string> {
    // The typecast here is a bit strange. executeKw declares it returns a string,
    // but it actually returns an object.

    return 'moo';
  }
}
