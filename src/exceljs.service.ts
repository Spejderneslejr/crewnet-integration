import { Injectable, Logger } from '@nestjs/common';
import { Workbook } from 'exceljs';
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

  async writeObject(
    columns: Array<{ header: string; key: string; width: number }>,
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
