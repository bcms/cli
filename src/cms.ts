import * as FormData from 'form-data';
import * as path from 'path';
import {
  Args,
  createTasks,
  fileReplacer,
  getInstanceId,
  Select,
  Zip,
} from './util';
import type { ApiClient } from '@becomes/cms-cloud-client/types';
import { login } from './login';
import { prompt } from 'inquirer';
import { ChildProcess } from '@banez/child_process';
import { createFS } from '@banez/fs';
import { StringUtility } from '@banez/string-utility';

const fs = createFS({
  base: process.cwd(),
});

export class CMS {
  static async bundle(): Promise<void> {
    const tasks = createTasks([
      {
        title: 'Remove dist',
        async task() {
          await fs.deleteDir('dist');
        },
      },
      {
        title: 'Build typescript',
        async task() {
          await ChildProcess.spawn('npm', ['run', 'build']);
        },
      },
      {
        title: 'Fix imports',
        async task() {
          if (await fs.exist(path.join(process.cwd(), 'dist', 'functions'))) {
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
          const bcmsConfig = await fs.readString('bcms.config.js');
          const pluginString = StringUtility.textBetween(
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
              if (await fs.exist(['plugins', pluginName], true)) {
                pluginList.push(plugins[i].raw);
                await fs.copy(
                  ['plugins', pluginName],
                  ['dist', 'plugins', pluginName],
                );
              }
            }
            if (pluginList.length > 0) {
              await fs.save(
                ['dist', 'plugin-list.json'],
                JSON.stringify(pluginList),
              );
            }
          }
        },
      },
      {
        title: 'Copy package.json',
        async task() {
          const packageJson = JSON.parse(await fs.readString('package.json'));
          delete packageJson.scripts;
          delete packageJson.devDependencies;
          await fs.save(
            ['dist', 'custom-package.json'],
            JSON.stringify(packageJson, null, '  '),
          );
        },
      },
      {
        title: 'Copy src data',
        async task() {
          await fs.copy('src', ['dist', '_src']);
        },
      },
      {
        title: 'Zip output',
        async task() {
          await fs.save(
            ['dist', 'bcms.zip'],
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
    if (!(await fs.exist(['dist', 'bcms.zip'], true))) {
      await this.bundle();
    }
    const instanceId = await getInstanceId();
    const zip = await fs.read(['dist', 'bcms.zip']);
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
          await ChildProcess.spawn('git', [
            'clone',
            'https://github.com/becomesco/cms',
            repoName,
          ]);
          // TODO: Remove this line when ready for production
          await ChildProcess.spawn('git', ['checkout', 'next'], {
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
            await fs.mkdir(tmpPath);
            Zip.unzip({ location: tmpPath, buffer });
            await fs.deleteDir(path.join(repoPath, 'src'));
            await fs.copy(
              path.join(repoPath, tmpName, '_src'),
              path.join(repoPath, 'src'),
            );
            const customPackageJson = JSON.parse(
              await fs.readString(
                path.join(repoPath, tmpName, 'custom-package.json'),
              ),
            );
            const packageJson = JSON.parse(
              await fs.readString(path.join(repoPath, 'package.json')),
            );
            for (const depName in customPackageJson.dependencies) {
              packageJson.dependencies[depName] =
                customPackageJson.dependencies[depName];
            }
            await fs.save(
              path.join(repoPath, 'package.json'),
              JSON.stringify(packageJson, null, '  '),
            );
            await fs.deleteDir(path.join(repoPath, tmpName));
          }
          await fs.save(
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
