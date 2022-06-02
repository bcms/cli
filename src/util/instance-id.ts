import { createFS } from '@banez/fs';
import * as path from 'path';

const fs = createFS();

export async function getInstanceId(): Promise<string> {
  const shimJsonPath = path.join(process.cwd(), 'shim.json');
  if (!(await fs.exist(shimJsonPath, true))) {
    throw Error(`Missing ${shimJsonPath}`);
  }
  const shimJson = JSON.parse(await fs.readString(shimJsonPath));
  if (typeof shimJson.instanceId !== 'string') {
    throw Error(`Missing "instanceId" in shim.json.`);
  }
  return shimJson.instanceId;
}
