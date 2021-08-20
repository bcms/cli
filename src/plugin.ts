import { prompt } from 'inquirer';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Args, createTasks, System } from './util';

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
          await System.spawn('npm', ['run', 'build:vue']);
        },
      },
      {
        title: 'Inject plugin name',
        async task() {
          if (
            await System.exist(
              path.join(process.cwd(), 'bcms-plugin.config.json'),
              true,
            )
          ) {
            const pluginConfig: { pluginName: string } = JSON.parse(
              await System.readFile(
                path.join(process.cwd(), 'bcms-plugin.config.json'),
              ),
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
          const filePaths = await System.fileTree(
            path.join(process.cwd(), 'dist', 'ui'),
            '',
          );
          for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            let file = await System.readFile(filePath.abs);
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
            await System.writeFile(filePath.abs, file);
          }
        },
      },
      {
        title: 'Build backend',
        async task() {
          await System.spawn('npm', ['run', 'build:backend']);
        },
      },
      {
        title: 'Inject backend paths and plugin name',
        async task() {
          const goBackBase = '../..';
          const filePaths = await System.fileTree(
            path.join(process.cwd(), 'dist', 'backend'),
            '',
          );
          for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            const fileDepth = filePath.rel.split('/');
            const base = [goBackBase, ...Array(fileDepth).map(() => '..')].join(
              '/',
            );
            let file = await System.readFile(filePath.abs);
            let buffer = '' + file;
            let loop = true;
            while (loop) {
              file = file
                .replace('@becomes/cms-backend', base)
                .replace('@bcms', base);
              if (file === buffer) {
                loop = false;
              } else {
                buffer = '' + file;
              }
            }
            await System.writeFile(filePath.abs, file);
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
          packageJson = JSON.parse(
            await System.readFile(path.join(process.cwd(), 'package.json')),
          );
          packageJson.name = `@becomes/cms-plugin-${pluginName}`;
          packageJson.devDependencies = undefined;
          packageJson.nodemonConfig = undefined;
          packageJson.scripts = undefined;
          await System.writeFile(
            path.join(process.cwd(), 'dist', pluginName, 'package.json'),
            JSON.stringify(packageJson, null, ''),
          );
        },
      },
      {
        title: 'Pack',
        async task() {
          await System.spawn('npm', ['pack'], {
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
