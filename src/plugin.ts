import { prompt } from 'inquirer';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as FormData from 'form-data';
import { createTasks } from './util';
import { ChildProcess } from '@banez/child_process';
import { createFS } from '@banez/fs';
import type { Args } from './types';
import type { ApiClient } from '@becomes/cms-cloud-client/types';
import { login } from './login';
import { createTerminalProgressBar, Terminal } from './terminal';

const fs = createFS({
  base: process.cwd(),
});

export class Plugin {
  static async bundle(_args: Args): Promise<void> {
    let pluginName = '';
    let packageJson: any = {};
    const tasks = createTasks([
      {
        title: 'Remove dist',
        async task() {
          await fse.remove(path.join(process.cwd(), 'dist'));
        },
      },
      {
        title: 'Build Vue app',
        async task() {
          await ChildProcess.spawn('npm', ['run', 'build:vue']);
          await fse.move(
            path.join(process.cwd(), 'dist', 'ui', 'index.html'),
            path.join(process.cwd(), 'dist', 'ui', '_index.html'),
          );
        },
      },
      {
        title: 'Inject plugin name',
        async task() {
          if (await fs.exist('bcms-plugin.config.json', true)) {
            const pluginConfig: { pluginName: string } = JSON.parse(
              await fs.readString('bcms-plugin.config.json'),
            );
            pluginName = pluginConfig.pluginName
              .toLowerCase()
              .replace(/ /g, '-')
              .replace(/_/g, '-')
              .replace(/--/g, '-')
              .replace(/[^a-z0-9---]/g, '');
          } else {
            const result = await prompt<{ name: string }>([
              {
                type: 'input',
                name: 'name',
                message: 'Enter a plugin name:',
                validate(value: string) {
                  if (value.trim() === '') {
                    return 'You must enter a name.';
                  }
                  return true;
                },
              },
            ]);
            pluginName = result.name
              .toLowerCase()
              .replace(/ /g, '-')
              .replace(/_/g, '-')
              .replace(/--/g, '-')
              .replace(/[^a-z0-9---]/g, '');
          }
          const filePaths = await fs.fileTree(['dist', 'ui'], '');
          for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            let file = await fs.readString(filePath.path.abs);
            let buffer = '' + file;
            let loop = true;
            while (loop) {
              file = file.replace('bcms-plugin---name', pluginName);
              if (file === buffer) {
                loop = false;
              } else {
                buffer = '' + file;
              }
            }
            await fs.save(filePath.path.abs, file);
          }
        },
      },
      {
        title: 'Build backend',
        async task() {
          await ChildProcess.spawn('npm', ['run', 'build:backend']);
        },
      },
      {
        title: 'Inject backend paths and plugin name',
        async task() {
          const filePaths = await fs.fileTree(['dist', 'backend'], '');
          for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            let file = await fs.readString(filePath.path.abs);
            let buffer = '' + file;
            let loop = true;
            while (loop) {
              file = file.replace('bcms-plugin---name', pluginName);
              if (file === buffer) {
                loop = false;
              } else {
                buffer = '' + file;
              }
            }
            await fs.save(filePath.path.abs, file);
          }
        },
      },
      {
        title: 'Group files',
        async task() {
          await fse.copy(
            path.join(process.cwd(), 'dist', 'backend'),
            path.join(process.cwd(), 'dist', pluginName, 'backend'),
          );
          await fse.copy(
            path.join(process.cwd(), 'dist', 'ui'),
            path.join(process.cwd(), 'dist', pluginName, 'ui'),
          );
          await fse.remove(path.join(process.cwd(), 'dist', 'backend'));
          await fse.remove(path.join(process.cwd(), 'dist', 'ui'));
        },
      },
      {
        title: 'Copy package.json',
        async task() {
          packageJson = JSON.parse(await fs.readString('package.json'));
          packageJson.name = `@becomes/cms-plugin-${pluginName}`;
          packageJson.devDependencies = undefined;
          packageJson.nodemonConfig = undefined;
          packageJson.scripts = undefined;
          await fs.save(
            ['dist', pluginName, 'package.json'],
            JSON.stringify(packageJson, null, '  '),
          );
        },
      },
      {
        title: 'Pack',
        async task() {
          await ChildProcess.spawn('npm', ['pack'], {
            cwd: path.join(process.cwd(), 'dist', pluginName),
            stdio: 'inherit',
          });
          await new Promise<void>((resolve) => {
            setTimeout(async () => {
              await fse.copy(
                path.join(
                  process.cwd(),
                  'dist',
                  pluginName,
                  `becomes-cms-plugin-${pluginName}-${packageJson.version}.tgz`,
                ),
                path.join(
                  process.cwd(),
                  'dist',
                  `becomes-cms-plugin-${pluginName}-${packageJson.version}.tgz`,
                ),
              );
              await fse.remove(
                path.join(
                  process.cwd(),
                  'dist',
                  pluginName,
                  `becomes-cms-plugin-${pluginName}-${packageJson.version}.tgz`,
                ),
              );
              resolve();
            }, 1000);
          });
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
    if (!(await fs.exist('dist'))) {
      await Plugin.bundle(args);
    }
    let files = await fs.readdir('dist');
    let file = files.find((e) => e.endsWith('.tgz'));
    if (!file) {
      await Plugin.bundle(args);
      files = await fs.readdir('dist');
      file = files.find((e) => e.endsWith('.tgz'));
    }
    const fileName = file as string;
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }
    const user = await client.user.get();
    const instances = (await client.instance.getAll()).filter((e) =>
      e.user.list.find((u) => u.id === user._id && u.role === 'ADMIN'),
    );
    if (instances.length === 0) {
      console.log('You do not have ADMIN access to any instance.');
      return;
    }
    const promptResult = await prompt<{ instId: string }>([
      {
        name: 'instId',
        type: 'list',
        choices: instances.map((inst) => {
          return {
            name: inst.name,
            value: inst._id,
          };
        }),
        message: 'Select an instance to deploy this plugin to:',
      },
    ]);
    const inst = instances.find((e) => e._id === promptResult.instId);
    if (!inst) {
      throw Error('Failed to find instance.');
    }
    const pluginInfo = JSON.parse(
      await fs.readString('bcms-plugin.config.json'),
    );
    const pluginNameEncoded = pluginInfo.pluginName
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/_/g, '-')
      .replace(/--/g, '-')
      .replace(/[^a-z0-9---]/g, '');
    const packageJson = JSON.parse(
      await fs.readString(['dist', pluginNameEncoded, 'package.json']),
    );
    const tag = Buffer.from(packageJson.name).toString('hex');
    const version = packageJson.version;
    const tgz = await fs.read(['dist', fileName]);
    const formData = new FormData();
    formData.append('media', tgz, {
      filename: fileName,
      contentType: 'application/x-compressed-tar',
    });
    const progressBar = createTerminalProgressBar({
      state: {
        name: 'Upload plugin to the cloud',
        progress: 0,
      },
    });
    Terminal.pushComponent({
      name: 'progress',
      component: progressBar,
    });
    await client.media.set.instancePlugin({
      instanceId: inst._id,
      orgId: inst.org.id,
      name: pluginInfo.pluginName,
      tag,
      version,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formData: formData as any,
      onProgress(value) {
        progressBar.update({
          state: {
            name: 'Upload plugin to the cloud',
            progress: value,
          },
        });
        Terminal.render();
      },
    });
  }
}
