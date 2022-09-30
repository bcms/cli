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
import {
  createTerminalProgressBar,
  createTerminalTitle,
  Terminal,
} from './terminal';
import { StringUtility } from '@becomes/purple-cheetah';

const fs = createFS({
  base: process.cwd(),
});

export class Plugin {
  static async resolve({
    args,
    client,
  }: {
    args: Args;
    client: ApiClient;
  }): Promise<void> {
    if (args.plugin === 'bundle') {
      await this.bundle();
    } else if (args.plugin === 'deploy') {
      Terminal.pushComponent({
        name: 'title',
        component: createTerminalTitle({
          state: {
            text: 'Plugin deploy',
          },
        }),
      });
      Terminal.render();
      await this.deploy({ args, client });
    } else if (args.plugin === 'create') {
      Terminal.pushComponent({
        name: 'title',
        component: createTerminalTitle({
          state: {
            text: 'Plugin create',
          },
        }),
      });
      Terminal.render();
      await this.create({ args, client });
    }
  }

  static async bundle(): Promise<void> {
    let pluginName = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          await ChildProcess.spawn('npm', ['run', 'build:ui'], {
            stdio: 'inherit',
            cwd: process.cwd(),
          });
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
          packageJson.name = `bcms-plugin-${pluginName}`;
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
                  `bcms-plugin-${pluginName}-${packageJson.version}.tgz`,
                ),
                path.join(
                  process.cwd(),
                  'dist',
                  `bcms-plugin-${pluginName}-${packageJson.version}.tgz`,
                ),
              );
              await fse.remove(
                path.join(
                  process.cwd(),
                  'dist',
                  pluginName,
                  `bcms-plugin-${pluginName}-${packageJson.version}.tgz`,
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
      await Plugin.bundle();
    }
    let files = await fs.readdir('dist');
    let file = files.find((e) => e.endsWith('.tgz'));
    if (!file) {
      await Plugin.bundle();
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

  static async create(_data: { args: Args; client: ApiClient }): Promise<void> {
    const answers = await prompt<{ projectName: string }>([
      {
        name: 'projectName',
        message: 'Enter a plugin name:',
        type: 'input',
        default: `My BCMS Plugin`,
      },
    ]);
    const projectName = answers.projectName;
    const formattedProjectName = StringUtility.toSlug(projectName);
    const repoFs = createFS({
      base: path.join(process.cwd(), formattedProjectName),
    });
    await createTasks([
      {
        title: 'Clone GitHub repository',
        task: async () => {
          await ChildProcess.spawn(
            'git',
            [
              'clone',
              'https://github.com/becomesco/cms-plugin-starter',
              formattedProjectName,
            ],
            {
              stdio: 'inherit',
              cwd: process.cwd(),
            },
          );
        },
      },
      {
        title: 'Install project dependencies',
        task: async () => {
          await ChildProcess.spawn('npm', ['i'], {
            stdio: 'inherit',
            cwd: path.join(process.cwd(), formattedProjectName),
          });
        },
      },
      {
        title: 'Setup project',
        task: async () => {
          await ChildProcess.spawn('npm', ['run', 'setup'], {
            stdio: 'inherit',
            cwd: path.join(process.cwd(), formattedProjectName),
          });
        },
      },
      {
        title: 'Set plugin name',
        task: async () => {
          const pluginJson = JSON.parse(
            await repoFs.readString('bcms-plugin.config.json'),
          );
          pluginJson.pluginName = projectName;
          await repoFs.save(
            'bcms-plugin.config.json',
            JSON.stringify(pluginJson, null, '  '),
          );
        },
      },
    ]).run();

    console.log('\n\n\nDone :)');
    console.log(`\n\ncd ${formattedProjectName}`);
    console.log('docker-compose up');
  }
}
