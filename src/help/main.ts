import { createFS } from '@banez/fs';

export async function help() {
  const fs = createFS({
    base: __dirname,
  });
  console.log(await fs.readString(['general.txt']));
}
