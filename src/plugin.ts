import { prompt } from 'inquirer';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Args, createTasks } from './util';
import { ChildProcess } from '@banez/child_process';
import { createFS } from '@banez/fs';

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
}
