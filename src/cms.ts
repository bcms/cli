import * as path from 'path';
import * as nodeFs from 'fs';
import {
  createSdk3,
  createTasks,
  fileReplacer,
  getInstanceId,
  MediaUtil,
  Select,
  Zip,
} from './util';
import { login } from './login';
import { prompt } from 'inquirer';
import { ChildProcess } from '@banez/child_process';
import { createFS } from '@banez/fs';
import type { Args } from './types';
import Axios from 'axios';
import {
  createTerminalList,
  createTerminalProgressBar,
  createTerminalTitle,
  Terminal,
} from './terminal';
import {
  BCMSLanguage,
  BCMSMedia,
  BCMSMediaType,
  BCMSSocketEventName,
} from '@becomes/cms-sdk/types';
import type { Stream } from 'stream';
import type {
  BCMSCloudSdk,
  InstanceDep,
  InstanceFJEType,
  InstanceProtectedWithStatus,
} from '@becomes/cms-cloud-client';

const fs = createFS({
  base: process.cwd(),
});

export class CMS {
  static async resolve({
    args,
    client,
  }: {
    args: Args;
    client: BCMSCloudSdk;
  }): Promise<void> {
    if (args.cms === 'bundle') {
      await this.bundle();
    } else if (args.cms === 'deploy') {
      await this.deploy({ args, client });
    } else if (args.cms === 'backup') {
      await this.backup({ client, args });
    } else if (args.cms === 'restore') {
      await this.restore({ client, args });
    } else if (args.cms === 'create') {
      await this.create();
    } else if (args.cms === 'dump') {
      await this.dump({ args, client });
    }
  }

  static async restore({
    args,
    client,
  }: {
    args: Args;
    client: BCMSCloudSdk;
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
      if (await tmpFs.exist('')) {
        await tmpFs.deleteDir('');
      }
      console.log('Unpacking archive ...');
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
    const { instance } = await Select.instance({ client });
    titleComponent.update({
      state: {
        text: `BCMS Backup - ${instance.name}`,
      },
    });
    Terminal.render();
    const origin = await Select.instanceDomain({ instance, client });
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
        message: `Are you sure you want to restore data to: ${instance.name} - ${origin}?`,
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
  }

  static async backup({
    client,
    args,
  }: {
    client: BCMSCloudSdk;
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
    const { instance } = await Select.instance({ client });
    titleComponent.update({
      state: {
        text: `BCMS Backup - ${instance.name}`,
      },
    });
    const origin = await Select.instanceDomain({ instance, client });
    const sdk3 = createSdk3({
      origin,
    });
    const otp = await client.user.getOtp();
    const user = await client.user.get();
    await sdk3.shim.verify.otp(`${user._id}_${otp}`);
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
          await fs.copy('dist', 'raw');
          await fs.copy('raw', ['dist', 'raw']);
          await fs.deleteDir('raw');
        },
      },
      {
        title: 'Fix imports',
        async task() {
          const dirs = ['functions', 'events', 'jobs', 'additional'];
          for (let i = 0; i < dirs.length; i++) {
            const dir = dirs[i];
            if (await fs.exist(path.join(process.cwd(), 'dist', dir))) {
              await fileReplacer({
                basePath: '../src',
                dirPath: path.join(process.cwd(), 'dist', dir),
                regex: [
                  /@becomes\/cms-backend\/src/g,
                  /@bcms/g,
                  /@becomes\/cms-backend/g,
                ],
                endsWith: ['.js', '.ts'],
              });
            }
          }
        },
      },
      {
        title: 'Find dependencies',
        async task() {
          const packageJson = JSON.parse(await fs.readString('package.json'));
          const deps: InstanceDep[] = [];
          if (packageJson.dependencies) {
            for (const depName in packageJson.dependencies) {
              deps.push({
                _id: '',
                createdAt: 0,
                updatedAt: 0,
                instanceId: '',
                name: depName,
                version: packageJson.dependencies[depName],
              });
            }
          }
          await fs.save(
            ['dist', 'deps.json'],
            JSON.stringify(
              deps.map((e) => {
                return { name: e.name, version: e.version };
              }),
              null,
              '  ',
            ),
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
    client: BCMSCloudSdk;
  }): Promise<void> {
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }
    let instance: InstanceProtectedWithStatus;
    const instanceId: string = await getInstanceId();
    if (instanceId) {
      const instances = await client.instance.getAll();
      instance = instances.find(
        (e) => e._id === instanceId,
      ) as InstanceProtectedWithStatus;
      if (!instance) {
        throw Error(
          `Instance with ID "${instanceId}" cannot be found on your account.`,
        );
      }
    } else {
      const answers = await Select.instance({ client });
      instance = answers.instance;
      const shimJson = JSON.parse(await fs.readString('shim.json'));
      shimJson.instanceId = instance._id;
      await fs.save('shim.json', JSON.stringify(shimJson));
    }
    const confirm = await prompt<{ yes: boolean }>([
      {
        name: 'yes',
        type: 'confirm',
        message: [
          `Are you sure you want to upload new code to ${instance.name}?`,
          `This action is irreversible.`,
        ].join(' '),
      },
    ]);

    async function pushFje(
      namespace: string,
      logName: string,
      fjeType: InstanceFJEType,
    ) {
      const fjes = (
        await client.instanceFje.getAllByType({
          instanceId: instance._id,
          type: fjeType,
        })
      ).filter((e) => e.external);
      if (await fs.exist(['dist', namespace])) {
        const files = (await fs.readdir(['dist', namespace])).filter((e) =>
          e.endsWith('.js'),
        );
        const fnNames: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const fileName = files[i];
          console.log(`[${fjeType}] Working on ${fileName} ...`);
          const file = await fs.readString(['dist', namespace, fileName]);
          const itemName = fileName.replace('.js', '');
          const existingFje = fjes.find((e) => e.name === itemName);
          fnNames.push(itemName);
          if (existingFje) {
            process.stdout.write(`Updating ${logName}: ${itemName} ...`);
            try {
              await client.instanceFje.update({
                _id: existingFje._id,
                instanceId: instance._id,
                name: itemName,
                code: {
                  raw: file,
                },
              });
              process.stdout.write(' - DONE\n');
            } catch (error) {
              process.stdout.write(' - FAIL\n');
              console.warn(error);
            }
          } else {
            process.stdout.write(`Creating ${logName}: ${itemName} ...`);
            try {
              await client.instanceFje.create({
                instanceId: instance._id,
                type: fjeType,
                name: itemName,
                external: true,
                code: {
                  raw: file,
                },
              });
              process.stdout.write(' - DONE\n');
            } catch (error) {
              process.stdout.write(' - FAIL\n');
              console.warn(error);
            }
          }
        }
        for (let i = 0; i < fjes.length; i++) {
          const fje = fjes[i];
          if (!fnNames.includes(fje.name)) {
            process.stdout.write(`Deleting ${logName}: ${fje.name} ... `);
            try {
              await client.instanceFje.deleteById({
                instanceId: instance._id,
                id: fje._id,
              });
              process.stdout.write(' - DONE\n');
            } catch (error) {
              process.stdout.write(' - FAIL\n');
              console.log(error);
            }
          }
        }
      } else {
        for (let i = 0; i < fjes.length; i++) {
          const fje = fjes[i];
          process.stdout.write(`Deleting ${logName}: ${fje.name} ... `);
          try {
            await client.instanceFje.deleteById({
              instanceId: instance._id,
              id: fje._id,
            });
            process.stdout.write(' - DONE\n');
          } catch (error) {
            process.stdout.write(' - FAIL\n');
            console.log(error);
          }
        }
      }
    }

    if (confirm.yes) {
      await createTasks([
        {
          title: 'Deploy functions',
          task: async () => {
            await pushFje('functions', 'function', 'F' as InstanceFJEType);
          },
        },
        {
          title: 'Deploy events',
          task: async () => {
            await pushFje('events', 'event', 'E' as InstanceFJEType);
          },
        },
        {
          title: 'Deploy jobs',
          task: async () => {
            await pushFje('jobs', 'job', 'J' as InstanceFJEType);
          },
        },
        {
          title: 'Initialize additional assets',
          task: async () => {
            const namespace = 'additional';
            const logName = 'additional file';
            const afs = await client.instanceAdditionalFile.getAll({
              instanceId: instance._id,
            });
            if (await fs.exist(['dist', namespace])) {
              const files = await fs.fileTree(['dist', namespace], '');
              for (let i = 0; i < files.length; i++) {
                const fileInfo = files[i];
                const file = await fs.readString(fileInfo.path.abs);
                try {
                  await client.instanceAdditionalFile.create({
                    instanceId: instance._id,
                    path: fileInfo.path.rel,
                    code: file,
                  });
                  process.stdout.write('DONE\n');
                } catch (error) {
                  process.stdout.write('FAIL\n');
                  console.log(error);
                }
              }
              for (let i = 0; i < afs.length; i++) {
                const af = afs[i];
                const fileInfo = files.find((e) => e.path.rel === af.path);
                if (!fileInfo) {
                  process.stdout.write(`Deleting ${logName}: ${af.path} ... `);
                  try {
                    await client.instanceAdditionalFile.deleteById({
                      instanceId: instance._id,
                      id: af._id,
                    });
                    process.stdout.write('DONE\n');
                  } catch (error) {
                    process.stdout.write('FAIL\n');
                    console.log(error);
                  }
                }
              }
            } else {
              for (let i = 0; i < afs.length; i++) {
                const af = afs[i];
                process.stdout.write(`Deleting ${logName}: ${af.path} ... `);
                try {
                  await client.instanceAdditionalFile.deleteById({
                    instanceId: instance._id,
                    id: af._id,
                  });
                  process.stdout.write('DONE\n');
                } catch (error) {
                  process.stdout.write('FAIL\n');
                  console.log(error);
                }
              }
            }
          },
        },
        {
          title: 'Initialize dependencies',
          task: async () => {
            if (await fs.exist(['dist', 'deps.json'], true)) {
              const deps: InstanceDep[] = JSON.parse(
                await fs.readString(['dist', 'deps.json']),
              );
              const existingDeps = await client.instanceDep.getAll({
                instanceId: instance._id,
              });
              for (let i = 0; i < deps.length; i++) {
                const dep = deps[i];
                const existingDep = existingDeps.find(
                  (e) => e.name === dep.name,
                );
                try {
                  if (existingDep) {
                    process.stdout.write(`Updating dependency: ${dep.name}`);
                    await client.instanceDep.update({
                      _id: existingDep._id,
                      instanceId: existingDep.instanceId,
                      name: dep.name,
                      version: dep.version,
                    });
                  } else {
                    process.stdout.write(`Creating dependency: ${dep.name}`);
                    await client.instanceDep.create({
                      instanceId: instance._id,
                      name: dep.name,
                      version: dep.version,
                    });
                  }
                  process.stdout.write(' - DONE\n');
                } catch (error) {
                  process.stdout.write(' - FAIL\n');
                  console.error(error);
                }
              }
            }
          },
        },
      ]).run();
    }
  }

  static async dump({
    args,
    client,
  }: {
    args: Args;
    client: BCMSCloudSdk;
  }): Promise<void> {
    Terminal.pushComponent({
      name: 'title',
      component: createTerminalTitle({
        state: {
          text: 'Dump BCMS date',
        },
      }),
    });
    Terminal.render();
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }
    if (await fs.exist('temp.zip', true)) {
      await fs.deleteFile('temp.zip');
    }
    if (await fs.exist('temp')) {
      await fs.deleteDir('temp');
    }
    const result = await Select.cloudOrLocal({ client });
    const apiOrigin = result.cloud
      ? await Select.instanceDomain({ client, instance: result.cloud.instance })
      : 'http://localhost:8080';
    const sdk = createSdk3({
      origin: apiOrigin,
    });
    const otp = await client.user.getOtp();
    const user = await client.user.get();
    await sdk.shim.verify.otp(`${user._id}_${otp}`);
    console.log(
      'Creating data bundle.',
      'Please wait, this might take a few minutes.',
      'This depends on the BCMS data size.',
    );
    const backupPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject('120s Timeout');
      }, 120000);
      const interval = setInterval(async () => {
        if (backupItem) {
          const list = await sdk.backup.list();
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (backupItem._id === item._id) {
              if (item.available) {
                backupItem = item;
                clearTimeout(timeout);
                clearInterval(interval);
                unsub();
                resolve();
                break;
              }
            }
          }
        }
      }, 2000);
      const unsub = sdk.socket.subscribe(
        BCMSSocketEventName.BACKUP,
        async () => {
          clearTimeout(timeout);
          clearInterval(interval);
          unsub();
          resolve();
        },
      );
    });
    let backupItem = await sdk.backup.create({ media: true });
    await backupPromise;
    const downloadHash = await sdk.backup.getDownloadHash({
      fileName: backupItem._id,
    });
    console.log('Downloading data ...');
    const res = await Axios({
      url: `${apiOrigin}/api/backup/${downloadHash}`,
      responseType: 'stream',
    });
    const totalLength = parseInt(res.headers['content-length']);
    let downloadedLength = 0;
    const writer = nodeFs.createWriteStream(
      path.join(process.cwd(), 'temp.zip'),
    );
    const data = res.data as Stream;
    data.pipe(writer);
    const progressName = 'Download data';
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
    await new Promise<void>((resolve) => {
      data.on('data', (chunk) => {
        downloadedLength += chunk.length;
        progress.update({
          state: {
            name: progressName,
            progress: (100 / totalLength) * downloadedLength,
          },
        });
        Terminal.render();
      });
      data.on('end', () => {
        resolve();
      });
    });
    Terminal.removeComponent('progress');
    Terminal.render();
    console.log('Unpacking data ...');
    Zip.unzip({
      location: path.join(process.cwd(), 'temp'),
      buffer: await fs.read('temp.zip'),
    });
    Zip.unzip({
      location: path.join(process.cwd(), 'temp', 'uploads'),
      buffer: await fs.read(['temp', 'uploads.zip']),
    });
    if (await fs.exist('uploads')) {
      await fs.deleteDir('uploads');
    }
    await fs.copy(['temp', 'uploads', 'uploads'], 'uploads');
    if (await fs.exist('db')) {
      await fs.deleteDir('db');
    }
    console.log('Transform data ...');
    const files = await fs.readdir(['temp', 'db']);
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const items = JSON.parse(await fs.readString(['temp', 'db', fileName]));
      const output: { [id: string]: any } = {};
      for (let k = 0; k < items.length; k++) {
        const item = items[k];
        output[item._id] = item;
      }
      await fs.save(
        ['db', 'bcms', fileName],
        JSON.stringify(output, null, '  '),
      );
    }
    console.log('Cleanup ...');
    await fs.deleteFile('temp.zip');
    await fs.deleteDir('temp');
  }

  static async create(): Promise<void> {
    const answers = await prompt<{ projectName: string }>([
      {
        name: 'projectName',
        message: 'Enter a project name',
        type: 'input',
        default: 'my-bcms',
      },
    ]);

    await createTasks([
      {
        title: 'Clone GitHub repository',
        task: async () => {
          await ChildProcess.spawn('git', [
            'clone',
            'https://github.com/bcms/cms',
            answers.projectName,
          ]);
        },
      },
      {
        title: 'Prepare repository',
        task: async () => {
          await ChildProcess.spawn('node', ['post-cms-create.js'], {
            stdio: 'inherit',
            cwd: path.join(process.cwd(), answers.projectName),
          });
        },
      },
      {
        title: 'Setup project',
        task: async () => {
          await ChildProcess.spawn('npm', ['run', 'setup'], {
            stdio: 'inherit',
            cwd: path.join(process.cwd(), answers.projectName),
          });
        },
      },
    ]).run();

    console.log(
      [
        '',
        'Done :)',
        '',
        '',
        `$ cd ${answers.projectName}`,
        '$ docker-compose up',
        '',
        '',
      ].join('\n'),
    );
  }
}
