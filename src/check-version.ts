import { createFS } from '@banez/fs';
import axios from 'axios';
import type { UpdateCliData } from './update-cli';
import { ChildProcess } from '@banez/child_process';

export async function getVersionInfo(): Promise<UpdateCliData> {
  const fs = createFS({
    base: process.cwd(),
  });
  const data: UpdateCliData = {
    global: false,
    local: 'none',
  };
  let currVersion = '';
  try {
    const res = await axios({
      url: 'https://raw.githubusercontent.com/bcms/cli/master/versions.json',
    });
    currVersion = res.data.curr
      .split('.')
      .map((e: string) => e.slice(e.length - 1, e.length))
      .join('.');
  } catch (error) {
    // Do nothing.
    return data;
  }
  if (await fs.exist('package.json', true)) {
    const packageJson = JSON.parse(await fs.readString('package.json'));
    if (
      packageJson.dependencies &&
      packageJson.dependencies['@becomes/cms-cli']
    ) {
      if (packageJson.dependencies['@becomes/cms-cli'] !== currVersion) {
        data.local = 'prod';
      }
    } else if (
      packageJson.devDependencies &&
      packageJson.devDependencies['@becomes/cms-cli']
    ) {
      if (packageJson.devDependencies['@becomes/cms-cli'] !== currVersion) {
        data.local = 'dev';
      }
    }
  }
  {
    let listInfo = '';
    try {
      await ChildProcess.advancedExec('npm list -g @becomes/cms-cli', {
        onChunk(_type, chunk) {
          listInfo += chunk;
        },
      }).awaiter;
      const packageName = listInfo.split('\n')[1];
      if (packageName.includes('@becomes/cms-cli')) {
        const version = packageName.split('@')[2].split('\n')[0];
        console.log({ version, packageName });
        if (currVersion !== version) {
          data.global = true;
        }
      }
    } catch (error) {
      // Do nothing
    }
  }
  return data;
}
