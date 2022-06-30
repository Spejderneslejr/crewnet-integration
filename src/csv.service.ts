import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

export type ImageContactRecord = {
  image: {
    base64Data: string;
  };
  rowData: {
    [key: string]: string;
  };
};
export type SpreadsheetHeaders = string[];

@Injectable()
export class CSVService {
  constructor(private readonly logger: Logger) {}

  async convertSpreadsheet(filePath: string): Promise<any[]> {
    this.logger.log('Reading path ' + filePath);
    const resolved = path.resolve(__dirname, filePath);
    this.logger.log('Resolved to ' + resolved);
    try {
      const data = fs.readFileSync(resolved, 'utf8');
      const records = parse(data, {
        columns: true,
        skip_empty_lines: true,
      });

      this.logger.log('Loaded ' + records.length + ' records');
      if (records.length > 0) {
        this.logger.debug('Got columns ' + Object.keys(records[0]).join(','));
      }

      return records;
    } catch (error) {
      this.logger.error('Could not read ' + filePath, error);
      return;
    }
  }

  async loadImageCsv(filePath: string): Promise<{
    name: string;
    headers: SpreadsheetHeaders;
    data: Array<ImageContactRecord>;
  }> {
    const rows = await this.convertSpreadsheet(filePath);
    const filename = path.parse(filePath).base;

    // We assume first row is headers.
    if (rows.length === 0) {
      throw new Error('No rows loaded');
    }

    const headersRaw = Object.keys(rows[0]);
    this.logger.log({ headersRaw });
    const headers: string[] = [];

    // Quite loose, but as we know what data we're working with and can assume
    // the use can verify the output, it should be ok.
    const billederHeader = /billede/i;

    let headerFound = false;
    let billedeHeaderName = '';
    for (const header of headersRaw) {
      // Don't pass the Billede header
      this.logger.log('Nope: ' + header);
      if (header.match(billederHeader) === null) {
        headers.push(header);
        continue;
      }

      if (headerFound) {
        throw new Error(
          'Found multiple billede columns! already found' +
            billedeHeaderName +
            ', stopping at ' +
            header,
        );
      }

      headerFound = true;
      billedeHeaderName = header;
      this.logger.debug('Billede header is ' + billedeHeaderName);
    }

    // Build up the rows, separate out the image.
    if (!headerFound) {
      throw new Error(
        'Could not find Billede header in ' + headersRaw.join(', '),
      );
    }

    const data = [];

    for (const row of rows) {
      // This should be an object with a single billede property, and a bunch of other properties.

      const imageRecord = {};
      imageRecord['image'] = { base64Data: row[billedeHeaderName] };
      delete row[billedeHeaderName];
      imageRecord['rowData'] = row;

      this.logger.log({ row });
      data.push(imageRecord);
    }

    return {
      name: filename,
      headers,
      data,
    };
  }
}
