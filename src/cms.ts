import * as path from 'path';
import * as fse from 'fs-extra';
import { createTasks, fileReplacer, StringUtil, System } from './util';
import { Zip } from './util/zip';

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
}