import { Injectable, Logger } from '@nestjs/common';
import { Column, Workbook } from 'exceljs';

export type LicenseImageStatus = 'OK' | 'MANGLER' | 'LILLE BILLEDE';

export type MemberLicenseData = {
  memberNumber: string;
  inputName: string;
  email: string;
  camposName: string;
  area: string;
  department: string;
  licenses: string[];
  imageStatus: LicenseImageStatus;
};

@Injectable()
export class ExcelJSService {
  constructor(private readonly logger: Logger) {}

  async convertSpreadsheet(path: string) {
    console.log(path);
    const workbook = new Workbook();
    console.log('workbook : ' + workbook);
    await workbook.xlsx.readFile(path);
    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet.getRow(1);
    let imageColumn = -1;
    headerRow.eachCell((cell, colNumber) => {
      if (cell.toString().match(/^Billede/) !== null) {
        imageColumn = colNumber;
      }
    });

    if (imageColumn === -1) {
      this.logger.error('Could not detect image column in header row');
      return;
    }

    worksheet.eachRow(function (row, rowNumber) {
      if (rowNumber == 1) {
        return;
      }
      const encodedImage = row.getCell(imageColumn).value.valueOf() as string;

      console.log(encodedImage.length);
      const decoded = Buffer.from(encodedImage, 'base64');
      console.log(decoded);

      const image = workbook.addImage({
        buffer: decoded,
        extension: 'jpeg',
      });
      worksheet.addImage(image, {
        tl: { col: imageColumn - 1 + 1, row: rowNumber - 1 },
        ext: { width: 500, height: 200 },
      });
    });
    await workbook.xlsx.writeFile('out.xlsx');
  }

  async getLicenseInput(path: string) {
    const workbook = new Workbook();
    await workbook.xlsx.readFile(path);
    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet.getRow(1);
    // verify headers.
    const expectedFields = ['Medlemsnummer', 'Navn', 'Område', 'Udvalg'];

    const indexColumn = 2;
    // Fields are 1-indexed
    for (let i = 1; i < expectedFields.length + 1; i++) {
      const actualField = headerRow.getCell(i).toString();
      const expectedField = expectedFields[i - 1];

      if (actualField !== expectedField) {
        throw new Error(
          `Expected field ${expectedField} at index ${i} but found ${actualField}`,
        );
      }
    }

    const inputData: {
      memberNumber: string;
      name: string;
      area: string;
      department: string;
    }[] = [];

    worksheet.eachRow(function (row, rowNumber) {
      // Skip the header row.
      if (rowNumber == 1) {
        return;
      }

      // Skip rows with missing index.
      if (!row.getCell(indexColumn).value) {
        return;
      }

      // TODO, this could be a bit more clever, but will do for now. Keep
      // it in sync with expectedFields
      inputData.push({
        memberNumber: row.getCell(1).value?.toString().trim(),
        name: row.getCell(2).value?.toString().trim(),
        area: row.getCell(3).value?.toString().trim(),
        department: row.getCell(4).value?.toString().trim(),
      });
    });
    return inputData;
  }

  async getFullLicenseInput(path: string) {
    const workbook = new Workbook();
    await workbook.xlsx.readFile(path);
    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet.getRow(1);
    // verify headers.
    const expectedFields = [
      'Medlemsnummer',
      'Navn',
      'Fuldt navn',
      'Email',
      'Område',
      'Udvalg',
      'Kørekort kategorier',
      'Billede',
    ];

    const indexColumn = 1;
    // Fields are 1-indexed
    for (let i = 1; i < expectedFields.length + 1; i++) {
      const actualField = headerRow.getCell(i).toString();
      const expectedField = expectedFields[i - 1];

      if (actualField !== expectedField) {
        throw new Error(
          `Expected field ${expectedField} at index ${i} but found ${actualField}`,
        );
      }
    }

    const inputData: MemberLicenseData[] = [];

    worksheet.eachRow(function (row, rowNumber) {
      // Skip the header row.
      if (rowNumber == 1) {
        return;
      }

      // Skip rows with missing index.
      if (!row.getCell(indexColumn).value) {
        return;
      }

      // TODO, this could be a bit more clever, but will do for now. Keep
      // it in sync with expectedFields
      inputData.push({
        memberNumber: row.getCell(1).value?.toString().trim(),
        inputName: row.getCell(2).value?.toString().trim(),
        camposName: row.getCell(3).value?.toString().trim(),
        email: row.getCell(4).value?.toString().trim(),
        area: row.getCell(5).value?.toString().trim(),
        department: row.getCell(6).value?.toString().trim(),
        licenses: row
          .getCell(7)
          .value?.toString()
          .split('\n')
          .filter((e) => e !== ''),
        imageStatus: row
          .getCell(8)
          .value?.toString()
          .trim() as LicenseImageStatus,
      });
    });
    return inputData;
  }

  async writeObject(
    columns: Partial<Column>[],
    rows: Array<object>,
    path: string,
  ) {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet();
    worksheet.addRow;
    worksheet.columns = columns;
    for (const row of rows) {
      worksheet.addRow(row);
    }

    await workbook.xlsx.writeFile(path);
  }
}
