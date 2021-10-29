import { readFile } from 'fs/promises';
import * as path from 'path';
import { Zip } from './util';

async function main() {
  // const buffer = await Zip.create({
  //   location: path.join(process.cwd(), 'src', 'types'),
  // });
  // await System.writeFile(path.join(process.cwd(), 'test.zip'), buffer);
  // await mkdir(path.join(process.cwd(), '_t'));
  const buffer = await readFile(path.join(process.cwd(), 'test.zip'));
  await Zip.unzip({ location: path.join(process.cwd(), '_t'), buffer });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
