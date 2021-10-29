import { readFile } from 'fs/promises';
import * as AdmZip from 'adm-zip';
import { System } from '.';

export class Zip {
  static async create(config: { location: string }): Promise<Buffer> {
    const zip = new AdmZip();
    const files = await System.fileTree(config.location, '');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileParts = file.abs.split('/');
      const fileName = fileParts[fileParts.length - 1];
      const fileData = await readFile(file.abs);
      zip.addFile(file.rel ? `${file.rel}/${fileName}` : fileName, fileData);
    }
    return zip.toBuffer();
  }
  static unzip({
    location,
    buffer,
  }: {
    location: string;
    buffer: Buffer;
  }): void {
    const zip = new AdmZip(buffer);
    zip.extractAllTo(location);
  }
}
