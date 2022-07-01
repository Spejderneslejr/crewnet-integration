import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class CliUtilsService {
  constructor(private readonly logger: Logger) {}

  base64FileWriter = (filePath, base64Data) => {
    const promise = new Promise<void>((resolve, reject) => {
      fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err === null) {
          resolve();
        } else {
          reject(err);
        }
      });
    });

    return promise;
  };

  writeImage(imageDataBase64: string, outputDir: string, fileBase: string) {
    const type = this.getImageTypeFromBase64(imageDataBase64);

    if (type === null) {
      throw new Error(
        `Could not determine file-type from image data for ${fileBase}`,
      );
    }
    const filePath = `${outputDir}/${fileBase}.${type}`;
    this.logger.log(`writing ${filePath}`);
    return this.base64FileWriter(filePath, imageDataBase64);
  }

  imageLookup = {
    '/': 'jpg',
    i: 'png',
    R: 'gif',
    U: 'webp',
  };

  getImageTypeFromBase64(base64: string) {
    const firstChar = base64.charAt(0);
    const type = this.imageLookup[firstChar];

    return type || null;
  }
}
