import { Injectable, Logger } from '@nestjs/common';
import Jimp from 'jimp';

@Injectable()
export class JimpService {
  constructor(private readonly logger: Logger) {}

  async getOrientation(_path: string): Promise<'horizontal' | 'vertical'> {
    return 'vertical';
  }
}
