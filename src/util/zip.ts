import * as AdmZip from 'adm-zip';
import { createFS } from '@banez/fs';

const fs = createFS();

export class Zip {
  static async create(config: { location: string }): Promise<Buffer> {
    const zip = new AdmZip();
    const files = await fs.fileTree(config.location, '');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileParts = file.path.abs.split('/');
      const fileName = fileParts[fileParts.length - 1];
      const fileData = await fs.read(file.path.abs);
      zip.addFile(file.dir ? `${file.dir}/${fileName}` : fileName, fileData);
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
