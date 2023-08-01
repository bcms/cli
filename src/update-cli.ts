import { ChildProcess } from '@banez/child_process';
import axios from 'axios';

export interface UpdateCliData {
  local: 'prod' | 'dev' | 'none';
  global: boolean;
}

export async function updateCli(data: UpdateCliData): Promise<void> {
  let currVersion = 'latest';
  try {
    const res = await axios({
      url: 'https://raw.githubusercontent.com/bcms/cli/master/versions.json',
    });
    currVersion = res.data.curr;
  } catch (error) {
    // Do nothing.
  }
  if (data.local !== 'none') {
    if (data.local === 'dev') {
      await ChildProcess.spawn(
        'npm',
        ['i', '-D', `@becomes/cms-cli@${currVersion}`],
        {
          cwd: process.cwd(),
          stdio: 'inherit',
        }
      );
    } else if (data.local === 'prod') {
      await ChildProcess.spawn(
        'npm',
        ['i', '--save', `@becomes/cms-cli@${currVersion}`],
        {
          cwd: process.cwd(),
          stdio: 'inherit',
        }
      );
    }
  }
  if (data.global) {
    await ChildProcess.spawn('npm', [
      'i',
      '-g',
      `@becomes/cms-cli@${currVersion}`,
    ]);
  }
  console.log('\n\n\n\n\n', 'BCMS CLI updated successfully\n\n\n\n\n');
}
