import * as FormData from 'form-data';
import * as path from 'path';
import {
  createSdk3,
  createTasks,
  fileReplacer,
  getInstanceId,
  MediaUtil,
  Select,
  Zip,
} from './util';
import type {
  ApiClient,
  InstanceProtected,
} from '@becomes/cms-cloud-client/types';
import { login } from './login';
import { prompt } from 'inquirer';
import { ChildProcess } from '@banez/child_process';
import { createFS } from '@banez/fs';
import { StringUtility } from '@banez/string-utility';
import type { Args } from './types';
import type { Task } from '@banez/npm-tool/types';
import type { FS } from '@banez/fs/types';
import Axios from 'axios';
import {
  createTerminalList,
  createTerminalProgressBar,
  createTerminalTitle,
  Terminal,
} from './terminal';
import { BCMSLanguage, BCMSMedia, BCMSMediaType } from '@becomes/cms-sdk/types';

const fs = createFS({
  base: process.cwd(),
});

export class CMS {
  private static replaceCloudComments(data: string): string {
    return data
      .replace(/\/\/ ----%GLOBAL_START%----/g, '')
      .replace(/\/\/ ----%GLOBAL_END%----/g, '')
      .replace(/\/\*----%PUBLIC_START%----\*\//g, '')
      .replace(/\/\*----%PUBLIC_END%----\*\//g, '')
      .replace(/\/\/ ----%CODE_START%----/g, '')
      .replace(/\/\/ ----%CODE_END%----/g, '')
      .replace(/\/\*----%CONFIG_METHOD_START%----\*\//g, '')
      .replace(/\/\*----%CONFIG_METHOD_END%----\*\//g, '')
      .replace(/\/\*----%CONFIG_SCOPE_START%----\*\//g, '')
      .replace(/\/\*----%CONFIG_SCOPE_END%----\*\//g, '')
      .replace(/\/\*----%MAIN_START%----\*\//g, '')
      .replace(/\/\*----%MAIN_END%----\*\//g, '')
      .replace(/\/\*----%CRON_MIN_START%----\*\//g, '')
      .replace(/\/\*----%CRON_MIN_END%----\*\//g, '')
      .replace(/\/\*----%CRON_HOUR_START%----\*\//g, '')
      .replace(/\/\*----%CRON_HOUR_END%----\*\//g, '')
      .replace(/\/\*----%CRON_DOM_START%----\*\//g, '')
      .replace(/\/\*----%CRON_DOM_END%----\*\//g, '')
      .replace(/\/\*----%CRON_MON_START%----\*\//g, '')
      .replace(/\/\*----%CRON_MON_END%----\*\//g, '')
      .replace(/\/\*----%CRON_DOW_START%----\*\//g, '')
      .replace(/\/\*----%CRON_DOW_END%----\*\//g, '');
  }

  private static pullTasks(
    instance: InstanceProtected,
    repoFS: FS,
    client: ApiClient,
  ): Task[] {
    const localFilesMessage = [
      '/**',
      ' * IMPORTANT: This file comes from BCMS Cloud UI.',
      ' * If you want to edit this function do it from the',
      ' * Cloud UI because any changes to this file locally',
      ' * will not take place in the Cloud.',
      ' */',
      '',
    ].join('\n');
    return [
      {
        title: 'Save functions',
        task: async () => {
          for (let i = 0; i < instance.functions.length; i++) {
            const item = instance.functions[i];
            await repoFS.save(
              ['src', 'functions', '__' + item.name + '.js'],
              localFilesMessage +
                CMS.replaceCloudComments(
                  Buffer.from(item.code, 'base64').toString(),
                ),
            );
          }
        },
      },
      {
        title: 'Save jobs',
        task: async () => {
          for (let i = 0; i < instance.jobs.length; i++) {
            const item = instance.jobs[i];
            await repoFS.save(
              ['src', 'jobs', '__' + item.name + '.js'],
              localFilesMessage +
                CMS.replaceCloudComments(
                  Buffer.from(item.code, 'base64').toString(),
                ),
            );
          }
        },
      },
      {
        title: 'Save events',
        task: async () => {
          for (let i = 0; i < instance.events.length; i++) {
            const item = instance.events[i];
            await repoFS.save(
              ['src', 'events', '__' + item.name + '.js'],
              localFilesMessage +
                CMS.replaceCloudComments(
                  Buffer.from(item.code, 'base64').toString(),
                ),
            );
          }
        },
      },
      {
        title: 'Save plugins',
        task: async () => {
          const bcmsConfig = await repoFS.readString('bcms.config.js');
          const rawPluginList = StringUtility.textBetween(
            bcmsConfig,
            'plugins: [',
            ']',
          );
          const inject = !bcmsConfig.includes('plugins: [');
          const pluginList = rawPluginList
            .split(',')
            .map((e) =>
              e
                .replace(/ /g, '')
                .replace(/\n/g, '')
                .replace(/\r/g, '')
                .replace(/\t/g, '')
                .replace(/'/g, '')
                .replace(/"/g, ''),
            )
            .filter((e) => e);
          for (let i = 0; i < instance.plugins.length; i++) {
            const item = instance.plugins[i];
            const pluginData = await client.media.get.instancePlugin({
              orgId: instance.org.id,
              instanceId: instance._id,
              pluginId: item.id,
            });
            await repoFS.save(['plugins', item.id], pluginData);
            if (!pluginList.find((e) => e === item.tag)) {
              pluginList.push(item.tag);
            }
          }
          await repoFS.save(
            'bcms.config.js',
            inject
              ? bcmsConfig.replace(
                  'module.exports = createBcmsConfig({',
                  `module.exports = createBcmsConfig({\n  plugins: [${pluginList
                    .map((e) => `'${e}'`)
                    .join(', ')}],`,
                )
              : bcmsConfig.replace(
                  `plugins: [${rawPluginList}`,
                  'plugins: [' + pluginList.map((e) => `'${e}'`).join(', '),
                ),
          );
        },
      },
      {
        title: 'Add Cloud files to ignore',
        task: async () => {
          const startComment = '// ---- BCMS Cloud files - start ----\n';
          const endComment = '\n// ---- BCMS Cloud files - end ----';
          const ignoreFiles = [
            instance.functions
              .map((e) => `src/functions/__${e.name}.js`)
              .join('\n'),
            instance.events.map((e) => `src/events/__${e.name}.js`).join('\n'),
            instance.jobs.map((e) => `src/jobs/__${e.name}.js`).join('\n'),
          ].join('\n');
          let eslintIgnore = await repoFS.readString('.eslintignore');
          let gitIgnore = await repoFS.readString('.gitignore');
          const esInject = StringUtility.textBetween(
            eslintIgnore,
            startComment,
            endComment,
          );
          if (esInject) {
            eslintIgnore = eslintIgnore.replace(esInject, ignoreFiles);
          } else {
            eslintIgnore +=
              `\n${startComment}` + ignoreFiles + `${endComment}\n`;
          }
          const gitInject = StringUtility.textBetween(
            gitIgnore,
            startComment,
            endComment,
          );
          if (gitInject) {
            gitIgnore = gitIgnore.replace(gitInject, ignoreFiles);
          } else {
            gitIgnore += `\n${startComment}` + ignoreFiles + `${endComment}\n`;
          }
          await repoFS.save('.eslintignore', eslintIgnore);
          await repoFS.save('.gitignore', gitIgnore);
        },
      },
    ];
  }

  static async resolve({
    args,
    client,
  }: {
    args: Args;
    client: ApiClient;
  }): Promise<void> {
    if (args.cms === 'bundle') {
      await this.bundle();
    } else if (args.cms === 'deploy') {
      await this.deploy({ args, client });
    } else if (args.cms === 'clone') {
      await this.clone({ args, client });
    } else if (args.cms === 'backup') {
      await this.backup({ client, args });
    } else if (args.cms === 'restore') {
      await this.restore({ client, args });
    }
  }

  static async restore({
    args,
    client,
  }: {
    args: Args;
    client: ApiClient;
  }): Promise<void> {
    const titleComponent = createTerminalTitle({
      state: {
        text: 'BCMS Backup Restoring',
      },
    });
    Terminal.pushComponent({
      name: 'title',
      component: titleComponent,
    });
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }
    Terminal.render();
    const backupList = (await fs.readdir('')).filter(
      (e) => e.startsWith('bcms_backup_') && e.endsWith('.zip'),
    );
    if (backupList.length === 0) {
      throw Error('There are no backup files in current directory.');
    }
    const backupSelect = await prompt<{ file: string }>([
      {
        type: 'list',
        message: 'Select a backup file',
        name: 'file',
        choices: backupList,
      },
    ]);
    const tmpFs = createFS({
      base: path.join(process.cwd(), '__bcms_tmp'),
    });
    // Unzipping
    {
      Zip.unzip({
        location: path.join(process.cwd(), '__bcms_tmp'),
        buffer: await fs.read(backupSelect.file),
      });
      const unzipFiles = await tmpFs.readdir('');
      if (!unzipFiles.includes('db') || !unzipFiles.includes('uploads.zip')) {
        await tmpFs.deleteDir('');
        throw Error('Invalid backup format.');
      }
      Zip.unzip({
        location: path.join(process.cwd(), '__bcms_tmp'),
        buffer: await tmpFs.read('uploads.zip'),
      });
    }
    const { org, instance } = await Select.orgAndInstance({ client });
    titleComponent.update({
      state: {
        text: `BCMS Backup - ${org.name}, ${instance.name}`,
      },
    });
    Terminal.render();
    const origin = 'https://' + instance.domains[0];
    // const origin = 'http://localhost:8080';
    const sdk3 = createSdk3({
      origin,
    });
    const otp = await client.user.getOtp();
    await sdk3.shim.verify.otp(otp);
    const restoreOptions = [
      'All',
      'Templates',
      'Groups',
      'Widgets',
      'Api Keys',
      'Languages',
      'Entires',
      'Statuses',
      'Media',
    ];
    const whatToRestore = await prompt<{ answer: string[] }>([
      {
        message: 'What would you like to restore?',
        type: 'checkbox',
        choices: restoreOptions,
        name: 'answer',
      },
    ]);
    const { confirm } = await prompt<{ confirm: boolean }>([
      {
        message: `Are you sure you want to restore data to: ${org.name}, ${instance.name}?`,
        type: 'confirm',
        name: 'confirm',
      },
    ]);
    if (confirm) {
      let toRestore: string[] = [];
      if (whatToRestore.answer.includes('All')) {
        toRestore = [...restoreOptions.slice(1), 'ID Counters'];
      } else {
        toRestore = whatToRestore.answer;
      }
      const terminalList: {
        [name: string]: string;
      } = {};
      for (let i = 0; i < toRestore.length; i++) {
        const restore = toRestore[i];
        terminalList[restore] = '♺';
      }
      const listComponent = createTerminalList({
        state: {
          items: Object.keys(terminalList).map((e) => {
            return {
              text: `${e} ${terminalList[e]}`,
            };
          }),
        },
      });
      Terminal.pushComponent({
        name: 'list',
        component: listComponent,
      });
      Terminal.render();
      const dbFiles = await tmpFs.readdir(['db']);
      for (let i = 0; i < toRestore.length; i++) {
        const restore = toRestore[i];
        switch (restore) {
          case 'Templates':
            {
              const dbFile = dbFiles.find((e) => e.endsWith('_templates.json'));
              if (dbFile) {
                const items = JSON.parse(
                  await tmpFs.readString(['db', dbFile]),
                );
                await sdk3.backup.restoreEntities({
                  type: 'template',
                  items,
                });
              }
            }
            break;
          case 'Groups':
            {
              const dbFile = dbFiles.find((e) => e.endsWith('_groups.json'));
              if (dbFile) {
                const items = JSON.parse(
                  await tmpFs.readString(['db', dbFile]),
                );
                await sdk3.backup.restoreEntities({
                  type: 'group',
                  items,
                });
              }
            }
            break;
          case 'Widgets':
            {
              const dbFile = dbFiles.find((e) => e.endsWith('_widgets.json'));
              if (dbFile) {
                const items = JSON.parse(
                  await tmpFs.readString(['db', dbFile]),
                );
                await sdk3.backup.restoreEntities({
                  type: 'widget',
                  items,
                });
              }
            }
            break;
          case 'ID Counters':
            {
              const dbFile = dbFiles.find((e) =>
                e.endsWith('_id_counters.json'),
              );
              if (dbFile) {
                const items = JSON.parse(
                  await tmpFs.readString(['db', dbFile]),
                );
                await sdk3.backup.restoreEntities({
                  type: 'idc',
                  items,
                });
              }
            }
            break;
          case 'Media':
            {
              const dbFile = dbFiles.find((e) => e.endsWith('_medias.json'));
              if (dbFile) {
                const items = JSON.parse(
                  await tmpFs.readString(['db', dbFile]),
                ) as BCMSMedia[];
                await sdk3.backup.restoreEntities({
                  type: 'media',
                  items,
                });
                let progressName = 'Media';
                const progress = createTerminalProgressBar({
                  state: {
                    name: progressName,
                    progress: 0,
                  },
                });
                Terminal.pushComponent({
                  name: 'progress',
                  component: progress,
                });
                const fileItems = items.filter(
                  (e) => e.type !== BCMSMediaType.DIR,
                );
                for (let k = 0; k < fileItems.length; k++) {
                  const item = fileItems[k];
                  if (item.type !== BCMSMediaType.DIR) {
                    progressName = item.name;
                    progress.update({
                      state: {
                        name: progressName,
                        progress: (100 / fileItems.length) * k,
                      },
                    });
                    Terminal.render();
                    const pathToFile = await MediaUtil.v3.getPath({
                      media: item as never,
                      allMedia: items as never[],
                    });
                    if (
                      await tmpFs.exist(
                        ['uploads', ...pathToFile.split('/')],
                        true,
                      )
                    ) {
                      const buffer = await tmpFs.read([
                        'uploads',
                        ...pathToFile.split('/'),
                      ]);
                      await sdk3.backup.restoreMediaFile({
                        file: buffer,
                        name: item.name,
                        id: item._id,
                      });
                      // await new Promise<void>((resolve) => {
                      //   setTimeout(() => resolve(), 500);
                      // });
                    }
                  }
                }
              }
            }
            break;
          case 'Api Keys':
            {
              const dbFile = dbFiles.find((e) => e.endsWith('_api_keys.json'));
              if (dbFile) {
                const items = JSON.parse(
                  await tmpFs.readString(['db', dbFile]),
                );
                await sdk3.backup.restoreEntities({
                  type: 'apiKey',
                  items,
                });
              }
            }
            break;
          case 'Languages':
            {
              const dbFile = dbFiles.find((e) => e.endsWith('_languages.json'));
              if (dbFile) {
                const items = (
                  JSON.parse(
                    await tmpFs.readString(['db', dbFile]),
                  ) as BCMSLanguage[]
                ).filter((e) => e.code !== 'en');
                await sdk3.backup.restoreEntities({
                  type: 'language',
                  items,
                });
              }
            }
            break;
          case 'Entires':
            {
              const dbFile = dbFiles.find((e) => e.endsWith('_entries.json'));
              if (dbFile) {
                const items = JSON.parse(
                  await tmpFs.readString(['db', dbFile]),
                );
                await sdk3.backup.restoreEntities({
                  type: 'entry',
                  items,
                });
              }
            }
            break;
          case 'Statuses':
            {
              const dbFile = dbFiles.find((e) => e.endsWith('_statuses.json'));
              if (dbFile) {
                const items = JSON.parse(
                  await tmpFs.readString(['db', dbFile]),
                );
                await sdk3.backup.restoreEntities({
                  type: 'status',
                  items,
                });
              }
            }
            break;
        }
        terminalList[restore] = '✓';
        listComponent.update({
          state: {
            items: Object.keys(terminalList).map((e) => {
              return {
                text: `${e} ${terminalList[e]}`,
              };
            }),
          },
        });
        Terminal.render();
      }
    }
    await sdk3.user.logout();
    // await tmpFs.deleteDir('');
  }

  static async backup({
    client,
    args,
  }: {
    client: ApiClient;
    args: Args;
  }): Promise<void> {
    const titleComponent = createTerminalTitle({
      state: {
        text: 'BCMS Backup',
      },
    });
    Terminal.pushComponent({
      name: 'title',
      component: titleComponent,
    });
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }
    Terminal.render();
    const { org, instance } = await Select.orgAndInstance({ client });
    titleComponent.update({
      state: {
        text: `BCMS Backup - ${org.name}, ${instance.name}`,
      },
    });
    const origin = 'https://' + instance.domains[0];
    // const origin = 'http://localhost:8080';
    const sdk3 = createSdk3({
      origin,
    });
    const otp = await client.user.getOtp();
    await sdk3.shim.verify.otp(otp);
    const hash = await sdk3.backup.create({
      media: true,
    });
    const progress = createTerminalProgressBar({
      state: {
        name: 'Downloading backup file',
        progress: 0,
      },
    });
    Terminal.pushComponent({
      component: progress,
      name: 'progress',
    });
    Terminal.render();
    const res = await Axios({
      url: `${origin}/api/backup/${hash}`,
      method: 'GET',
      responseType: 'arraybuffer',

      onDownloadProgress(event) {
        progress.update({
          state: {
            name: progress.state ? progress.state.name : '',
            progress: progress.state ? progress.state.progress + 1 : 0,
          },
        });
        Terminal.render();
        console.log(event);
      },
    });
    await fs.save(`bcms_backup_${new Date().toISOString()}.zip`, res.data);
    await sdk3.user.logout();
  }

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
        formData: formData as never,
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
    const repoFS = createFS({
      base: path.join(process.cwd(), repoName),
    });

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
          await repoFS.mkdir('uploads');
          await repoFS.save(['db', 'bcms.fsdb.json'], '{}');
        },
      },
      {
        title: 'Install dependencies',
        task: async () => {
          await ChildProcess.spawn('npm', ['i'], {
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
                orgId: instance.org.id,
              },
              null,
              '  ',
            ),
          );
        },
      },
      ...CMS.pullTasks(instance, repoFS, client),
    ]);
    await tasks.run();
  }

  static async pull({
    args,
    client,
  }: {
    args: Args;
    client: ApiClient;
  }): Promise<void> {
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }
    const repoFS = createFS({
      base: process.cwd(),
    });
    const shimJson = JSON.parse(await repoFS.readString('shim.json'));
    const instance = await client.instance.get({
      orgId: shimJson.orgId,
      instanceId: shimJson.instanceId,
    });
    if (instance) {
      await createTasks(CMS.pullTasks(instance, repoFS, client)).run();
    }
  }
}
