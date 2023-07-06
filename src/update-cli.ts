import { ChildProcess } from '@banez/child_process';

export interface UpdateCliData {
  local: 'prod' | 'dev' | 'none';
  global: boolean;
}

export async function updateCli(data: UpdateCliData): Promise<void> {
  console.log(data);
  if (data.local !== 'none') {
    if (data.local === 'dev') {
      await ChildProcess.spawn('npm', ['i', '-D', '@becomes/cms-cli@latest'], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
    } else if (data.local === 'prod') {
      await ChildProcess.spawn(
        'npm',
        ['i', '--save', '@becomes/cms-cli@latest'],
        {
          cwd: process.cwd(),
          stdio: 'inherit',
        },
      );
    }
  }
  if (data.global) {
    await ChildProcess.spawn('npm', ['i', '-g', '@becomes/cms-cli@latest']);
  }
  console.log('\n\n\n\n\n', 'BCMS CLI updated successfully\n\n\n\n\n');
}
