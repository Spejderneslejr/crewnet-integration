import { Injectable, Logger } from '@nestjs/common';
import readXlsxFile from 'read-excel-file/node';

export type WorkplaceCategoryData = {
  // CampOS id of the volunteer
  partnerId: number;
  // CampOS organization - eg Udvalgs id.
  organizationId: number;
  // Name of the CampOS organization - should map to the CrewNet category name.
  organizationName: string;
};

export type WorkplaceImportData = {
  id: string;
  workplaceName: string;
  workplaceCategoryName: string;
};

const workplaceCategorySchema = {
  partner_id: {
    prop: 'partnerId',
    type: Number,
    required: true,
  },
  query_org_id: {
    prop: 'organizationId',
    type: Number,
    required: true,
  },
  crewnet_user: {
    prop: 'crewnetUser',
    type: Number,
    required: true,
  },
  org_name: {
    prop: 'organizationName',
    type: String,
  },
};

const workplaceImportSchema = {
  id: {
    prop: 'id',
    type: String,
    required: true,
  },
  hide: {
    prop: 'hide',
    type: String,
    required: true,
  },
  workplace_name: {
    prop: 'workplaceName',
    type: String,
    required: true,
  },
  campos_org_type: {
    prop: 'camposOrgType',
    type: String,
    required: true,
  },
  workplace_category_name: {
    prop: 'workplaceCategoryName',
    type: String,
    required: true,
  },
};

@Injectable()
export class XslxService {
  constructor(private readonly logger: Logger) {}

  async readWorkplaceCategories(
    path: string,
  ): Promise<Array<WorkplaceCategoryData>> {
    this.logger.log(`reading ${path}`);
    const { rows, errors } = await readXlsxFile(path, {
      schema: workplaceCategorySchema,
    });

    if (errors.length > 0) {
      errors.forEach((error) => {
        this.logger.error(
          `Error while parsing spreadsheet: row: ${error.row}, column: ${error.column}, value: "${error.value}", error: ${error.error}`,
        );
      });
      throw new Error(
        `Found ${errors.length} errors while validating, aborting`,
      );
    }

    // Cast should be safe as we won't get here unless the sheet validated.
    return rows as Array<WorkplaceCategoryData>;
  }

  async readWorkplaceImport(path: string): Promise<Array<WorkplaceImportData>> {
    this.logger.log(`reading ${path}`);
    const { rows, errors } = await readXlsxFile(path, {
      schema: workplaceImportSchema,
    });

    if (errors.length > 0) {
      errors.forEach((error) => {
        this.logger.error(
          `Error while parsing spreadsheet: row: ${error.row}, column: ${error.column}, value: "${error.value}", error: ${error.error}`,
        );
      });
      throw new Error(
        `Found ${errors.length} errors while validating, aborting`,
      );
    }

    // Cast should be safe as we won't get here unless the sheet validated.
    return rows as Array<WorkplaceImportData>;
  }
}
