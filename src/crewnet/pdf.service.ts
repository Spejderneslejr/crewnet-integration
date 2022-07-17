import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { PDFDocument, TextAlignment } from 'pdf-lib';

export type DriversLicenseData = {
  department: string;
  area: string;
  name: string;
  cat_b: boolean;
  cat_b1: boolean;
  cat_be: boolean;
  cat_c: boolean;
  cat_c1: boolean;
  cat_ce: boolean;
  cat_d: boolean;
  cat_d1: boolean;
  cat_de: boolean;
  cat_eu_bus: boolean;
  cat_eu_last: boolean;
  cat_truck_a: boolean;
  cat_truck_b: boolean;
  cat_kran: boolean;
  cat_lift: boolean;
  cat_teleskop: boolean;
  image: string;
};

export type AccessCardData = {
  department: string;
  area: string;
  name: string;
};

@Injectable()
export class PDFService {
  constructor(private readonly logger: Logger) {}

  async generateDriversLicense(
    templatePath: string,
    formData: DriversLicenseData,
    outPath: string,
  ) {
    const uint8Array = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(uint8Array);

    const form = pdfDoc.getForm();

    for (const field of ['department', 'area', 'name']) {
      if (formData[field]) {
        const value = formData[field];
        form.getTextField(field).setText(formData[field]);
        if (value.length > 30) {
          form.getTextField(field).setFontSize(7);
        }
      }
    }
    for (const field of [
      'cat_b',
      'cat_b1',
      'cat_be',
      'cat_c',
      'cat_c1',
      'cat_ce',
      'cat_d',
      'cat_d1',
      'cat_de',
      'cat_eu_bus',
      'cat_eu_last',
      'cat_truck_a',
      'cat_truck_b',
      'cat_kran',
      'cat_lift',
      'cat_teleskop',
    ]) {
      if (formData[field]) {
        form.getTextField(field).setText('X');
        form.getTextField(field).setAlignment(TextAlignment.Center);
      }
    }

    if (formData.image !== null) {
      const image = await pdfDoc.embedJpg(formData.image);
      form.getButton('image').setImage(image);
    }

    fs.writeFileSync(outPath, await pdfDoc.save());
    this.logger.log('Wrote ' + outPath);
  }

  async generateAccessCard(
    templatePath: string,
    formData: AccessCardData,
    outPath: string,
  ) {
    const uint8Array = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(uint8Array);

    const form = pdfDoc.getForm();

    for (const field of ['department', 'area', 'name']) {
      if (formData[field]) {
        const value = formData[field];
        form.getTextField(field).setText(formData[field]);
        if (value.length > 30) {
          form.getTextField(field).setFontSize(7);
        } else {
          form.getTextField(field).setFontSize(8);
        }
      }
    }

    fs.writeFileSync(outPath, await pdfDoc.save());
    this.logger.log('Wrote ' + outPath);
  }
}
