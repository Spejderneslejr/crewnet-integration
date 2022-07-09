import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { from } from 'rxjs';

export type FieldData = {
  department: string;
  area: string;
  name: string;
  function: string;
  other: string;
  cat_b: boolean;
  cat_c: boolean;
  cat_d: boolean;
  cat_be: boolean;
  cat_ce: boolean;
  cat_de: boolean;
  image: string;
};

@Injectable()
export class PDFService {
  constructor(private readonly logger: Logger) {}

  async generateDriversLicense(
    templatePath: string,
    formData: FieldData,
    outPath: string,
  ) {
    const uint8Array = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(uint8Array);

    const form = pdfDoc.getForm();

    for (const fieldName of form.getFields()) {
      this.logger.log(fieldName.getName());
    }

    for (const field of ['department', 'area', 'name', 'function', 'other']) {
      if (formData[field]) {
        form.getTextField(field).setText(formData[field]);
      }
    }

    for (const field of [
      'cat_b',
      'cat_c',
      'cat_d',
      'cat_be',
      'cat_ce',
      'cat_de',
    ]) {
      if (formData[field]) {
        form.getTextField(field).setText('X');
      }
    }

    if (formData.image !== null) {
      const image = await pdfDoc.embedJpg(formData.image);
      form.getButton('image').setImage(image);
    }

    fs.writeFileSync(outPath, await pdfDoc.save());
    this.logger.log('Wrote ' + outPath);
  }
}
