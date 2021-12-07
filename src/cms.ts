import { readFile, mkdir } from 'fs/promises';
import * as FormData from 'form-data';
import * as path from 'path';
import * as fse from 'fs-extra';
import {
  Args,
  createTasks,
  fileReplacer,
  getInstanceId,
  Select,
  StringUtil,
  System,
  Zip,
} from './util';
import type { ApiClient } from '@becomes/cms-cloud-client/types';
import { login } from './login';
import { prompt } from 'inquirer';

export class CMS {
  static async bundle(): Promise<void> {
    const tasks = createTasks([
      {
        title: 'Remove dist',
        async task() {
          await fse.remove(path.join(process.cwd(), 'dist'));
        },
      },
      {
        title: 'Build typescript',
        async task() {
          await System.spawn('npm', ['run', 'build']);
        },
      },
      {
        title: 'Fix imports',
        async task() {
          if (
            await System.exist(path.join(process.cwd(), 'dist', 'functions'))
          ) {
            await fileReplacer({
              basePath: '../src',
              dirPath: path.join(process.cwd(), 'dist', 'functions'),
              regex: [
                /@becomes\/cms-backend\/src/g,
                /@bcms/g,
                /@becomes\/cms-backend/g,
              ],
              endsWith: ['.js', '.ts'],
            });
          }
        },
      },
      {
        title: 'Copy local plugins',
        async task() {
          const bcmsConfig = await System.readFile(
            path.join(process.cwd(), 'bcms.config.js'),
          );
          const pluginString = StringUtil.textBetween(
            bcmsConfig,
            'plugins: [',
            ']',
          );
          const plugins = pluginString
            .split(',')
            .filter((e) => e)
            .map((e) => {
              const raw = e
                .replace(/'/g, '')
                .replace(/"/g, '')
                .replace(/ /g, '')
                .replace(/\n/g, '');
              return {
                formatted: raw.replace(/@/g, '').replace(/\//g, '-'),
                raw,
              };
            });
          if (plugins.length > 0) {
            const pluginList: string[] = [];
            for (let i = 0; i < plugins.length; i++) {
              const pluginName = plugins[i].formatted + '.tgz';
              if (
                await System.exist(
                  path.join(process.cwd(), 'plugins', pluginName),
                  true,
                )
              ) {
                pluginList.push(plugins[i].raw);
                await fse.copy(
                  path.join(process.cwd(), 'plugins', pluginName),
                  path.join(process.cwd(), 'dist', 'plugins', pluginName),
                );
              }
            }
            if (pluginList.length > 0) {
              await System.writeFile(
                path.join(process.cwd(), 'dist', 'plugin-list.json'),
                JSON.stringify(pluginList),
              );
            }
          }
        },
      },
      {
        title: 'Copy package.json',
        async task() {
          const packageJson = JSON.parse(
            await System.readFile(path.join(process.cwd(), 'package.json')),
          );
          delete packageJson.scripts;
          delete packageJson.devDependencies;
          await System.writeFile(
            path.join(process.cwd(), 'dist', 'custom-package.json'),
            JSON.stringify(packageJson, null, '  '),
          );
        },
      },
      {
        title: 'Copy src data',
        async task() {
          await fse.copy(
            path.join(process.cwd(), 'src'),
            path.join(process.cwd(), 'dist', '_src'),
          );
        },
      },
      {
        title: 'Zip output',
        async task() {
          await System.writeFile(
            path.join(process.cwd(), 'dist', 'bcms.zip'),
            await Zip.create({ location: path.join(process.cwd(), 'dist') }),
          );
        },
      },
    ]);
    await tasks.run();
  }
  static async deploy({
    args,
    client,
  }: {
    args: Args;
    client: ApiClient;
  }): Promise<void> {
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }
    if (
      !(await System.exist(path.join(process.cwd(), 'dist', 'bcms.zip'), true))
    ) {
      await this.bundle();
    }
    const instanceId = await getInstanceId();
    const zip = await readFile(path.join(process.cwd(), 'dist', 'bcms.zip'));
    const formData = new FormData();
    formData.append('media', zip, 'bcms.zip');
    const instances = await client.instance.getAll();
    const instance = instances.find((e) => e._id === instanceId);
    if (!instance) {
      throw Error(
        `Instance with ID "${instanceId}" cannot be found on your account.`,
      );
    }
    const org = await client.org.get({ id: instance.org.id });
    if (!org) {
      throw Error(`Failed to find Organization with ID "${instance.org.id}"`);
    }
    const confirm = await prompt<{ yes: boolean }>([
      {
        name: 'yes',
        type: 'confirm',
        message: [
          `Are you sure you want to upload new code to ${instance.name} in`,
          `organization ${org.name}? This action is irreversible.`,
        ].join(' '),
      },
    ]);
    if (confirm.yes) {
      await client.media.set.instanceZip({
        orgId: instance.org.id,
        instanceId,
        formData: formData as any,
        onProgress(progress) {
          console.log(`Uploaded ${progress}%`);
        },
      });
    }
  }
  static async clone({
    args,
    client,
  }: {
    args: Args;
    client: ApiClient;
  }): Promise<void> {
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }
    const { org, instance } = await Select.orgAndInstance({ client });
    const repoName = `${org.nameEncoded}-${instance.nameEncoded}`;
    const repoPath = path.join(process.cwd(), repoName);
    const tasks = createTasks([
      {
        title: 'Clone base GitHub repository',
        task: async () => {
          await System.spawn('git', [
            'clone',
            'https://github.com/becomesco/cms',
            repoName,
          ]);
          // TODO: Remove this line when ready for production
          await System.spawn('git', ['checkout', 'next'], {
            stdio: 'inherit',
            cwd: repoPath,
          });
        },
      },
      {
        title: 'Get instance data',
        task: async () => {
          console.log('zip', instance.zip);
          if (instance.zip) {
            const buffer = await client.media.get.instanceZip({
              orgId: org._id,
              instanceId: instance._id,
              onProgress(value) {
                console.log(`Downloading bcms.zip: ${value}%`);
              },
            });
            const tmpName = '__ziptmp';
            const tmpPath = path.join(repoPath, tmpName);
            await mkdir(tmpPath);
            Zip.unzip({ location: tmpPath, buffer });
            await fse.remove(path.join(repoPath, 'src'));
            await fse.copy(
              path.join(repoPath, tmpName, '_src'),
              path.join(repoPath, 'src'),
            );
            const customPackageJson = JSON.parse(
              await System.readFile(
                path.join(repoPath, tmpName, 'custom-package.json'),
              ),
            );
            const packageJson = JSON.parse(
              await System.readFile(path.join(repoPath, 'package.json')),
            );
            for (const depName in customPackageJson.dependencies) {
              packageJson.dependencies[depName] =
                customPackageJson.dependencies[depName];
            }
            await System.writeFile(
              path.join(repoPath, 'package.json'),
              JSON.stringify(packageJson, null, '  '),
            );
            await fse.remove(path.join(repoPath, tmpName));
          }
          await System.writeFile(
            path.join(repoPath, 'shim.json'),
            JSON.stringify(
              {
                code: 'local',
                local: true,
                instanceId: instance._id,
              },
              null,
              '  ',
            ),
          );
        },
      },
    ]);
    await tasks.run();
  }
}
