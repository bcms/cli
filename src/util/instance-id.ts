import * as path from 'path';
import { System } from '.';

export async function getInstanceId(): Promise<string> {
  const shimJsonPath = path.join(process.cwd(), 'shim.json');
  if (!(await System.exist(shimJsonPath, true))) {
    throw Error(`Missing ${shimJsonPath}`);
  }
  const shimJson = JSON.parse(await System.readFile(shimJsonPath));
  if (typeof shimJson.instanceId !== 'string') {
    throw Error(`Missing "instanceId" in shim.json.`);
  }
  return shimJson.instanceId;
}
