import { Injectable, Logger } from '@nestjs/common';
import { ApiconfigService } from './apiconfig.service';
import * as xmlrpc from 'xmlrpc';

export type UnitResult = {
  id: number;
  name: string;
};

export type GuestHelper = {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  birthdate: string | null;
  partner_id: number;
  email: string;
  mobile: string;
  organization_id: number | false;
  organization_name: string | null;
};

const countryCodeMap = {
  Afghanistan: '+93',
  Albanien: '+355',
  Algeriet: '+213',
  Andorra: '+376',
  Angola: '+244',
  Anguilla: '+1',
  'Antigua og Barbuda': '+1',
  Argentina: '+54',
  Armenien: '+374',
  Aruba: '+297',
  Ascension: '+247',
  Aserbajdsjan: '+994',
  Australien: '+61',
  'Australske Eksterritoriale Områder': '+672',
  Bahamas: '+1',
  Bahrain: '+973',
  Bangladesh: '+880',
  Barbados: '+1',
  Belgien: '+32',
  Belize: '+501',
  Benin: '+229',
  Bermuda: '+1',
  Bhutan: '+975',
  Bolivia: '+591',
  'Bosnien-Hercegovina': '+387',
  Botswana: '+267',
  Brasilien: '+55',
  'Brunei Darussalam': '+673',
  Bulgarien: '+359',
  'Burkina Faso': '+226',
  Burundi: '+257',
  Cambodja: '+855',
  Cameroun: '+237',
  Canada: '+1',
  Caymanøerne: '+1',
  'Centralafrikanske Republik': '+236',
  Chile: '+56',
  Colombia: '+57',
  Comorerne: '+269',
  Congo: '+242',
  'Congo, Den Demokratiske Republik': '+243',
  Cookøerne: '+682',
  'Costa Rica': '+506',
  "Cote d'Ivoire": '+225',
  Cuba: '+53',
  Cypern: '+357',
  Danmark: '+45',
  'Diego Garcia': '+246',
  Djibouti: '+253',
  Dominica: '+1',
  'Dominikanske Republik': '+1',
  Ecuador: '+593',
  Egypten: '+20',
  'El Salvador': '+503',
  England: '+44',
  Eritrea: '+291',
  Estland: '+372',
  Etiopien: '+251',
  Færøerne: '+298',
  Falklandsøerne: '+5+',
  Fiji: '+679',
  Filippinerne: '+63',
  Finland: '+358',
  'Forenede Arabiske Emirater': '+971',
  Frankrig: '+33',
  'Fransk Guyana': '+594',
  'Fransk Polynesien': '+689',
  Gabon: '+241',
  Gambia: '+220',
  Georgien: '+995',
  Ghana: '+233',
  Gibraltar: '+350',
  Grækenland: '+30',
  Grenada: '+1',
  Grønland: '+299',
  Guadeloupe: '+590',
  Guam: '+1',
  'Guantanamo Bay': '+53',
  Guatemala: '+502',
  Guinea: '+224',
  'Guinea-Bissau': '+245',
  Guyana: '+592',
  Haiti: '+509',
  Holland: '+31',
  'Hollandske Antiller': '+599',
  Honduras: '+504',
  'Hong Kong': '+852',
  Hviderusland: '+375',
  Indien: '+91',
  Indonesien: '+62',
  Irak: '+964',
  Iran: '+98',
  Irland: '+353',
  Island: '+354',
  Israel: '+972',
  'Italien samt Vatikanstaten': '+39',
  Jamaica: '+1',
  Japan: '+81',
  'Jomfruøerne, Amerikanske': '+1',
  'Jomfruøerne, Britiske': '+1',
  Jordan: '+962',
  'Kap Verde': '+238',
  Kasakhstan: '+7',
  Kenya: '+254',
  Kina: '+86',
  Kirgisistan: '+996',
  Kiribati: '+686',
  Kroatien: '+385',
  Kuwait: '+965',
  Laos: '+856',
  Lesotho: '+266',
  Letland: '+371',
  Libanon: '+961',
  Liberia: '+231',
  Libyen: '+218',
  Liechtenstein: '+423',
  Litauen: '+370',
  Luxembourg: '+352',
  Macau: '+853',
  Madagaskar: '+261',
  Makedonien: '+389',
  Malawi: '+265',
  Malaysia: '+60',
  Maldiverne: '+960',
  Mali: '+223',
  Malta: '+356',
  Marokko: '+212',
  Marshalløerne: '+692',
  Martinique: '+596',
  Mauretanien: '+222',
  Mauritius: '+230',
  Mayotte: '+269',
  Mexico: '+52',
  Mikronesien: '+691',
  Moldova: '+373',
  Monaco: '+377',
  Mongoliet: '+976',
  Montenegro: '+382',
  Montserrat: '+1',
  Mozambique: '+258',
  Myanmar: '+95',
  Nauru: '+674',
  Nepal: '+977',
  'New Zealand': '+64',
  Nicaragua: '+505',
  Niger: '+227',
  Nigeria: '+234',
  Niueøen: '+683',
  Nordkorea: '+850',
  Norfolkøen: '+672',
  Norge: '+47',
  'Ny Caledonien': '+687',
  Oman: '+968',
  Pakistan: '+92',
  Palæstina: '+970',
  Palauøerne: '+680',
  Panama: '+507',
  'Papua Ny Guinea': '+675',
  Paraguay: '+595',
  Peru: '+51',
  Polen: '+48',
  'Portugal m. Azorerne og Madeira': '+351',
  'Puerto Rico': '+1',
  Qatar: '+974',
  Réunion: '+262',
  Rumænien: '+40',
  Rusland: '+7',
  'Rusland, Astellit': '+7',
  'Rusland, BCL': '+7',
  'Rusland, Radius': '+7',
  'Rusland, Westbalt': '+7',
  Rwanda: '+250',
  'S. Helena': '+290',
  'S. Kitts & Nevis': '+1',
  'S. Lucia': '+1',
  'S. Pierre & Miquelon': '+508',
  'S. Vincent og Grenadinerne': '+1',
  Saipan: '+1',
  Salomonøerne: '+677',
  'Samoa, amerikansk': '+1684',
  'Samoa, vestsamoa': '+685',
  'San Marino': '+378',
  'Sao Tomé og Principe': '+239',
  'Saudi Arabien': '+966',
  Schweiz: '+41',
  Senegal: '+221',
  Serbien: '+381',
  Seychellerne: '+248',
  'Sierra Leone': '+232',
  Singapore: '+65',
  Slovakiet: '+421',
  Slovenien: '+386',
  Somalia: '+252',
  Spanien: '+34',
  'Sri Lanka': '+94',
  Storbritannien: '+44',
  Sudan: '+249',
  Surinam: '+597',
  Sverige: '+46',
  'Sverige, Kystzone. Dækkende HT-området og Bornholm': '+46',
  Swaziland: '+268',
  Sydafrika: '+27',
  Sydkorea: '+82',
  Sydsudan: '+211',
  Syrien: '+963',
  Tadsjikistan: '+992',
  Taiwan: '+886',
  Tanzania: '+255',
  Tchad: '+235',
  Thailand: '+66',
  Tjekkiet: '+420',
  Togo: '+228',
  Tokelau: '+690',
  Tonga: '+676',
  'Trinidad og Tobago': '+1',
  Tunesien: '+216',
  Turkmenistan: '+993',
  'Turks- og Caicosøerne': '+1',
  Tuvalu: '+688',
  Tyrkiet: '+90',
  Tyskland: '+49',
  'Tyskland, Grænsezone. Dækkende Sønderjyllands Amt': '+49',
  Uganda: '+256',
  Ukraine: '+380',
  Ungarn: '+36',
  'Universal Ring Gratis': '+8+',
  Uruguay: '+598',
  USA: '+1',
  Usbekistan: '+998',
  Vanuatu: '+678',
  Venezuela: '+58',
  Vietnam: '+84',
  'Wallis og Futuna': '+681',
  Yemen: '+967',
  Zambia: '+260',
  Zimbabwe: '+263',
  Ækvatorialguinea: '+240',
  'Øst Timor': '+670',
  Østrig: '+43',
};

@Injectable()
export class CamposService {
  constructor(private config: ApiconfigService, private logger: Logger) {}

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

  async memberByFullName(fullName: string) {
    // The typecast here is a bit strange. executeKw declares it returns a string,
    // but it actually returns an object.
    const members = await this.memberByFilter([['name', '=', fullName]]);

    if (members.length === 0) {
      throw new Error('Could not find member ' + fullName);
    }
    if (members.length > 1) {
      throw new Error('Got more than one member named  ' + fullName);
    }

    const member = members[0];
    return {
      member_number: member.member_number,
      image: member.image,
      // hard assumption from test-queries
      partner_id: member.partner_id[0] as number,
      name: member.name,
    };
  }

  async memberByMemberNumber(fullName: string): Promise<{
    member_number: string;
    image: string;
    partner_id: number;
    name: string;
    email: string;
  }> {
    // The typecast here is a bit strange. executeKw declares it returns a string,
    // but it actually returns an object.
    const members = await this.memberByFilter([
      ['member_number', '=', fullName],
    ]);
    if (members.length === 0) {
      throw new Error('Could not find member ' + fullName);
    }
    if (members.length > 1) {
      throw new Error('Got more than one member named  ' + fullName);
    }

    const member = members[0];
    return {
      member_number: member.member_number,
      image: member.image,
      // hard assumption from test-queries
      partner_id: member.partner_id[0] as number,
      name: member.name,
      email: member.email,
    };
  }

  async memberByFilter(filter: [string, string, string][]) {
    // The typecast here is a bit strange. executeKw declares it returns a string,
    // but it actually returns an object.
    const members = (await this.executeKw('member.profile', 'search_read', [], {
      domain: [
        ['organization_id', '=', 2],
        ['state', '=', 'active'],
        ...filter,
      ],
      fields: ['member_number', 'partner_id', 'name', 'image', 'email'],
      context: { show_org_path: true, lang: 'da_DK' },
    })) as unknown as Array<{
      member_number: string;
      image: string;
      partner_id: any[];
      name: string;
      email: string;
    }>;

    return members;
  }

  async getMemberCompetences(partnerID: number) {
    // The typecast here is a bit strange. executeKw declares it returns a string,
    // but it actually returns an object.
    const members = (await this.executeKw('hr.competence', 'search_read', [], {
      domain: [['partner_id', '=', partnerID]],
      fields: [
        'display_name',
        'hr_competence_group_id',
        'hr_competence_type_id',
        'partner_id',
      ],
      context: { show_org_path: true, lang: 'da_DK' },
    })) as unknown as Array<{
      display_name: string;
      hr_competence_group_id: any[];
      hr_competence_type_id: any[];
      partner_id: any[];
    }>;

    const returnMembers = members.map((member) => {
      // TODO - only map data that is somewhat clean, log if it is not.
      return {
        // hard assumptions from test-queries
        partner_id: member.partner_id[0] as number,
        competence_group_id: member.hr_competence_group_id[0],
        competence_group_name: member.hr_competence_group_id[1],
        competence_type_id: member.hr_competence_type_id[0],
        competence_type_name: member.hr_competence_type_id[1],
      };
    });
    this.logger.debug({ returnMembers });

    return returnMembers;
  }

  async memberWithCrewnetIdData() {
    // The typecast here is a bit strange. executeKw declares it returns a string,
    // but it actually returns an object.
    const members = (await this.executeKw('member.profile', 'search_read', [], {
      domain: [
        ['state', '=', 'active'],
        ['crewnet_user', '!=', false],
        ['crewnet_user', '!=', 0],
      ],
      fields: [
        'member_number',
        'crewnet_user',
        'partner_id',
        'mobile',
        'country_id',
        'birthdate_date',
        'email',
      ],
      context: { show_org_path: true, lang: 'da_DK' },
    })) as unknown as Array<{
      member_number: string;
      crewnet_user: number;
      partner_id: any[];
      mobile: any;
      country_id: [number, string];
      birthdate_date: string;
      email: string;
    }>;

    const returnMembers = members.map((member) => {
      // TODO - only map data that is somewhat clean, log if it is not.
      return {
        member_number: member.member_number,
        crewnet_user: member.crewnet_user,
        // hard assumption from test-queries
        partner_id: member.partner_id[0] as number,
        mobile: this.cleanPhoneNumber(
          member.mobile,
          member.country_id,
          member.crewnet_user,
          member.member_number,
        ),
        country_id: member.country_id,
        birthdate_date: member.birthdate_date,
        email: member.email,
      };
    });
    this.logger.debug({ returnMembers });

    return returnMembers;
  }

  async getCrewnetIdToCamposPartnerId() {
    const members = await this.memberWithCrewnetIdData();
    const crewnetIdToCamposPartnerId = members.reduce<{
      [keys: number]: number;
    }>((acc, current) => {
      acc[current.crewnet_user] = current.partner_id;
      return acc;
    }, {});

    return crewnetIdToCamposPartnerId;
  }

  matchDkPhone = /^((\+45)|(0045))(\d{8})$/;
  CODE_DENMARK = 59;

  cleanPhoneNumber(
    phoneNumber: string,
    country_id: [number, string],
    crewnet_user: number,
    member_number: string,
  ): string {
    if (!phoneNumber) {
      return '';
    }
    // Remove spaces
    phoneNumber = phoneNumber.replace(/\s/g, '').trim();

    // Remove som very specific cases where the number is ended with some text
    phoneNumber = phoneNumber.replace(/\(?\\?[a-zæøå]+\)?$/gi, '');
    const dkPhone = phoneNumber.match(this.matchDkPhone);
    if (dkPhone !== null) {
      return '+45' + dkPhone[4];
    }

    if (
      phoneNumber.length === 8 &&
      (country_id[0] === this.CODE_DENMARK || country_id[0] === undefined)
    ) {
      return '+45' + phoneNumber;
    }

    // If the number does not start with + but we have a country - throw in the country-code.
    if (
      phoneNumber.charAt(0) !== '+' &&
      phoneNumber.length > 4 &&
      countryCodeMap.hasOwnProperty(country_id[1]) &&
      phoneNumber.match(/^\d+$/) !== null &&
      // we already have a fix for this
      country_id[0] !== this.CODE_DENMARK
    ) {
      const fixedNumber = countryCodeMap[country_id[1]] + phoneNumber;
      this.logger.debug(
        `Fixing number for ${crewnet_user} / ${member_number}: Phone:"${phoneNumber}" Country: ${country_id[0]} / ${country_id[1]} - setting number to ${fixedNumber}`,
      );

      return fixedNumber;
    }

    if (phoneNumber.charAt(0) === '+' && phoneNumber.length > 1) {
      // Assume the number is already formatted
      return phoneNumber;
    }

    this.logger.debug(
      `Could not match/clean number for ${crewnet_user} / ${member_number}: Phone:"${phoneNumber}" ${phoneNumber.length} Country: ${country_id[0]} / ${country_id[1]}`,
    );
    return null;
  }

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

  async getUnit(unitId: number): Promise<Array<UnitResult>> {
    // The typecast here is a bit strange. executeKw declares it returns a string,
    // but it actually returns an object.
    const units: Array<any> = (await this.executeKw(
      'member.organization',
      'search_read',
      [],
      {
        domain: [
          ['belongs_to_company', '=', true],
          ['id', '=', unitId],
        ],
        fields: ['id', 'name'],
        context: { lang: 'da_DK' },
      },
    )) as unknown as Array<UnitResult>;

    return units;
  }

  GUEST_HELPER_PROJECT_ID = 6;
  GH_PARTNER_IGNORE = [537, 522];
  /**
   * Get a list of data of all guest helpers.
   *
   * Specifically get a list of data from the helper cases, and merge in data
   * from an optionally associated partner.
   *
   * @returns List of data on helpers
   */
  async getGuestHelperPartners(): Promise<Array<GuestHelper>> {
    // Get all tasks associated with the project.
    const getTasksResults = (await this.executeKw(
      'project.task',
      'search_read',
      [],
      {
        domain: [['project_id', '=', this.GUEST_HELPER_PROJECT_ID]],
        fields: [
          'id',
          'name',
          'partner_id',
          'related_email',
          'related_mobile',
          'organization_id',
        ],
        context: { lang: 'da_DK' },
      },
    )) as unknown as Array<{
      id: number;
      name: string;
      partner_id: any[];
      related_email: string;
      related_mobile: string;
      organization_id: any[];
    }>;

    // Go through the projects and find the associated  partner_ids we should fetch.
    // Also make sure the partner_id is either null or a number.
    const partnerIds = [];
    for (const task of getTasksResults) {
      if (
        task.partner_id &&
        task.partner_id[0] &&
        // Make sure we keep the list unique.
        !partnerIds.includes(task.partner_id[0]) &&
        // Ignore some specific partner ids
        !this.GH_PARTNER_IGNORE.includes(task.partner_id[0])
      ) {
        task.partner_id = task.partner_id[0];
        partnerIds.push(task.partner_id);
      } else {
        task.partner_id = null;
      }
    }

    // Fetch all the partners and build a lookup structure for when we need them
    // later.
    const partners = await this.getManyPartnerByIds(partnerIds);

    type PartnerData = {
      id: number;
      fullName: string;
      lastName: string;
      birthdate: string | null;
      firstName: string;
    };

    const partnerLookup: { [key: number]: PartnerData } = {};
    for (const partner of partners) {
      partnerLookup[partner.id] = partner;
    }

    // Go through the tasks again, this time we've loaded the partner data so
    // we can build the objects we need for further synchronizing.
    const returnData: GuestHelper[] = [];
    for (const taskResult of getTasksResults) {
      // We've ensured this cast is safe.
      const partner_id = taskResult.partner_id as any as null | number;
      let fullName = '';
      let firstName = '';
      let lastName = '';
      let birthdate = null;

      if (partner_id !== null) {
        const partnerData = partnerLookup[partner_id];
        // We filter out a special case where the name is an email.
        if (
          partnerData !== undefined &&
          partnerData.fullName.indexOf('@') === -1
        ) {
          fullName = partnerData.fullName;
          firstName = partnerData.firstName || '';
          lastName = partnerData.lastName || '';
          birthdate = partnerData.birthdate || '';
        }
      }

      returnData.push({
        id: taskResult.id,
        fullName: fullName,
        firstName: firstName,
        lastName: lastName,
        birthdate: birthdate,
        partner_id: partner_id,
        email: taskResult.related_email || '',
        mobile: taskResult.related_mobile,
        organization_id: taskResult.organization_id[0] as number,
        organization_name: taskResult.organization_id[1] as string,
      });
    }

    this.logger.debug({ returnData });
    return returnData;
  }

  async getManyPartnerByIds(partner_ids: number[]) {
    this.logger.log(
      `Fetching ${partner_ids.length} partners ${partner_ids.join(', ')}`,
    );

    const partners = (await this.executeKw('res.partner', 'search_read', [], {
      domain: [['id', 'in', partner_ids]],
      fields: [
        'name',
        'display_name',
        'firstname',
        'lastname',
        'birthdate_date',
      ],
    })) as unknown as Array<{
      id: number;
      name: string;
      firstname: string;
      lastname: string;
      birthdate_date: string | null;
    }>;

    this.logger.debug({ partners });

    return partners.map((partner) => {
      return {
        id: partner.id,
        fullName: partner.name,
        firstName: partner.firstname,
        lastName: partner.lastname,
        birthdate: partner.birthdate_date,
      };
    });
  }

  async getPartnerById(partner_id: number) {
    this.logger.log(`Fetching partner ${partner_id}`);

    const partners = (await this.executeKw('res.partner', 'search_read', [], {
      domain: [['id', '=', partner_id]],
      fields: ['name'],
      context: { lang: 'da_DK' },
    })) as unknown as Array<{
      id: number;
      name: string;
    }>;

    this.logger.debug('Fetched partner: ' + JSON.stringify(partners));

    return partners;
  }

  executeKw(
    model: string,
    method: string,
    paramsByPosition: any, //string[] = [],
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

    this.logger.debug({ fparams });
    return new Promise((resolve, reject) => {
      client.methodCall('execute_kw', fparams, function (error, value) {
        if (error) {
          return reject(error);
        }
        return resolve(value);
      });
    });
  }
}
