import { randomBytes } from 'crypto';
import { DockerUtil, Select } from './util';
import { prompt } from 'inquirer';
import { login } from './login';
import { Config } from './config';
import { Docker } from '@banez/docker';
import { ChildProcess } from '@banez/child_process';
import type { ChildProcessOnChunkHelperOutput } from '@banez/child_process/types';
import { Shim } from './shim';
import { createTasks } from '@banez/npm-tool';
import { createFS } from '@banez/fs';
import type { Args } from './types';
import { StringUtility } from '@banez/string-utility';
import { ObjectUtility } from '@becomes/purple-cheetah';
import { ObjectUtilityError } from '@becomes/purple-cheetah/types';
import type {
  BCMSCloudSdk,
  InstanceProtectedWithStatus,
} from '@becomes/cms-cloud-client';

export class Instance {
  static async resolve({
    args,
    client,
  }: {
    args: Args;
    client: BCMSCloudSdk;
  }): Promise<void> {
    if (args.instance === 'install' || args.install) {
      await this.install({ args, client });
    } else if (args.instance === 'machine-install') {
      await this.machineInstall({ args, client });
    }
  }

  static async machineInstall({
    args,
    client,
  }: {
    args: Args;
    client: BCMSCloudSdk;
  }): Promise<void> {
    if (!(await DockerUtil.setup({ args }))) {
      return;
    }
    const checkArgs = ObjectUtility.compareWithSchema(
      args,
      {
        licensePath: {
          __type: 'string',
          __required: true,
        },
        instanceId: {
          __type: 'string',
          __required: true,
        },
      },
      'args',
    );
    if (checkArgs instanceof ObjectUtilityError) {
      throw Error(checkArgs.message);
    }
    const license = {
      fileName: `${args.instanceId}.license`,
      value: await Config.server.linux.homeFs.readString(
        args.licensePath || '',
      ),
    };
    const instanceFsBase =
      Config.server.linux.homeBase + `/storage/${args.instanceId}`;
    const instanceFs = createFS({
      base: instanceFsBase,
    });
    if (!(await instanceFs.exist('mongodb'))) {
      await instanceFs.mkdir('mongodb');
    }
    if (!(await instanceFs.exist('fsdb'))) {
      await instanceFs.mkdir('fsdb');
    }
    await createTasks([
      {
        title: 'Verify BCMS license',
        async task() {
          if (
            license.value.indexOf('---- BEGIN BCMS LICENSE ----') === -1 ||
            license.value.indexOf('---- END BCMS LICENSE ----') === -1 ||
            license.value.split('\n').length !== 23
          ) {
            throw Error(
              [
                `Invalid license format of "${license.fileName}".`,
                'If you did not change the license file and you obtained it',
                'via "https://cloud.thebcms.com", please contact the support.',
              ].join(' '),
            );
          }
        },
      },
      {
        title: 'Prepare BCMS directory.',
        async task() {
          await Config.server.linux.homeFs.save(
            ['licenses', license.fileName],
            license.value,
          );
        },
      },
      {
        title: 'Setup Docker network',
        async task() {
          const exo: ChildProcessOnChunkHelperOutput = {
            out: '',
            err: '',
          };
          await ChildProcess.advancedExec(
            [
              'docker',
              'network',
              'create',
              '-d',
              'bridge',
              '--subnet',
              '10.20.0.0/16',
              '--ip-range',
              '10.20.30.0/24',
              '--gateway',
              '10.20.30.1',
              'bcms',
            ].join(' '),
            {
              onChunk: ChildProcess.onChunkHelper(exo),
              doNotThrowError: true,
            },
          ).awaiter;
          if (exo.err) {
            if (!exo.err.includes('network with name bcms already exists')) {
              throw Error(
                [
                  '[e1] Cannot create "bcms" docker network.',
                  'You will need to create it manually. ---',
                  exo.err,
                ].join(' '),
              );
            }
          } else if (!exo.out) {
            throw Error(
              [
                '[e2] Cannot create "bcms" docker network.',
                'You will need to create it manually.',
              ].join(' '),
            );
          }
        },
      },
      {
        title: 'Setup database',
        async task() {
          let setupDb = true;
          if (await instanceFs.exist('db-info.json', true)) {
            const { yes } = await prompt<{ yes: boolean }>([
              {
                message: [
                  'Database information detected.',
                  'Would you like to setup database again?',
                  'This will delete current database and setup a new one!',
                ].join(' '),
                type: 'confirm',
                name: 'yes',
              },
            ]);
            setupDb = yes;
          }
          if (setupDb) {
            const dbContainerName = `bcms-db-${args.instanceId}`;
            const dbInfo: {
              type: string;
              user: string;
              pass: string;
              name: string;
              cluster?: string;
              host?: string;
              port?: string;
            } = {
              type: 'auto',
              user: 'u_' + randomBytes(8).toString('hex'),
              pass: 'p_' + randomBytes(16).toString('hex'),
              name: 'admin',
              host: dbContainerName,
              port: '27017',
            };
            if (!(await Docker.image.exists('mongo:7'))) {
              await Docker.image.pull('mongo:7');
            }
            await instanceFs.copy(
              'mongodb',
              `mongodb_${new Date().toISOString()}_bak`,
            );
            await instanceFs.deleteDir('mongodb');
            await instanceFs.mkdir('mongodb');
            if (await Docker.container.exists(dbContainerName)) {
              await Docker.container.stop(dbContainerName);
              await Docker.container.remove(dbContainerName);
            }
            await Docker.container.run({
              args: {
                '--name': dbContainerName,
                '-d': [],
                '--network': 'bcms',
                '-e': [
                  `MONGO_INITDB_ROOT_USERNAME=${dbInfo.user}`,
                  `MONGO_INITDB_ROOT_PASSWORD=${dbInfo.pass}`,
                ],
                '-v': `${instanceFsBase}/mongodb:/data/db`,
                'mongo:7': [],
              },
            });
            const cronFile = `/var/spool/cron/crontabs/root`;
            let fileContent = '';
            if (!(await Config.server.linux.homeFs.exist(cronFile, true))) {
              await ChildProcess.advancedExec([
                'touch',
                cronFile,
                '&&',
                `chmod 600 ${cronFile}`,
              ]).awaiter;
            } else {
              fileContent = await Config.server.linux.homeFs.readString(
                cronFile,
              );
            }
            const dbPart = StringUtility.textBetween(
              fileContent,
              `# ---- DB ${dbContainerName} ----\n`,
              `\n# ---- DB END ${dbContainerName}`,
            );
            if (dbPart) {
              fileContent = fileContent.replace(
                dbPart,
                [
                  `@reboot sudo docker start ${dbContainerName}`,
                  `* * * * * sudo docker start ${dbContainerName}`,
                ].join('\n'),
              );
            } else {
              fileContent += [
                `# ---- DB ${dbContainerName} ----`,
                `@reboot sudo docker start ${dbContainerName}`,
                `* * * * * sudo docker start ${dbContainerName}`,
                `# ---- DB END ${dbContainerName}\n`,
              ].join('\n');
            }
            await Config.server.linux.homeFs.save(cronFile, fileContent);

            await instanceFs.save(
              'db-info.json',
              JSON.stringify(dbInfo, null, '  '),
            );
          }
        },
      },
    ]).run();
    await Shim.install({ args, client });
  }

  static async install({
    args,
    client,
  }: {
    args: Args;
    client: BCMSCloudSdk;
  }): Promise<void> {
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }

    if (!(await DockerUtil.setup({ args }))) {
      return;
    }

    /**
     * Get license
     */
    const instances = await client.instance.getAll();
    let instance: InstanceProtectedWithStatus = args.instanceId
      ? (instances.find(
          (e) => e._id === args.instanceId,
        ) as InstanceProtectedWithStatus)
      : (null as never);
    const license = {
      fileName: '',
      value: '',
    };
    const licensesPath = 'licenses';
    if (!(await Config.server.linux.homeFs.exist(licensesPath))) {
      await Config.server.linux.homeFs.mkdir(licensesPath);
    }
    // if (await Config.server.linux.homeFs.exist(licensesPath)) {
    //   if (!instance) {
    //     const files = await Config.server.linux.homeFs.readdir(licensesPath);
    //     const options: Array<{
    //       text: string;
    //       instance: InstanceProtectedWithStatus;
    //       org: Org;
    //     }> = [];
    //     for (let i = 0; i < files.length; i++) {
    //       const file = files[i];
    //       const instanceId = file.split('.')[0];
    //       const _instance = instances.find((e) => e._id === instanceId);
    //       if (_instance) {
    //         const _org = await client.org.get({ id: _instance.org.id });
    //         if (_org) {
    //           options.push({
    //             instance: _instance,
    //             org: _org,
    //             text: `${_org.name} - ${_instance.name}`,
    //           });
    //         }
    //       }
    //     }
    //     const result = await prompt<{
    //       select: {
    //         instance?: InstanceProtectedWithStatus;
    //         org?: Org;
    //       };
    //     }>([
    //       {
    //         type: 'list',
    //         message: 'Which license would you like to use?',
    //         name: 'select',
    //         choices: [
    //           ...options.map((e) => {
    //             return {
    //               name: e.text,
    //               value: {
    //                 org: e.org,
    //                 instance: e.instance,
    //               },
    //             };
    //           }),
    //           {
    //             name: 'Other...',
    //             value: {},
    //           },
    //         ],
    //       },
    //     ]);
    //     if (result.select.instance && result.select.org) {
    //       instance = result.select.instance;
    //       license.fileName = instance._id + '.license';
    //       license.value = await Config.server.linux.homeFs.readString([
    //         licensesPath,
    //         license.fileName,
    //       ]);
    //     }
    //   } else if (
    //     await Config.server.linux.homeFs.exist(
    //       [licensesPath, instance._id + '.license'],
    //       true,
    //     )
    //   ) {
    //     license.fileName = instance._id + '.license';
    //     license.value = await Config.server.linux.homeFs.readString([
    //       licensesPath,
    //       license.fileName,
    //     ]);
    //   }
    // } else {
    //   await Config.server.linux.homeFs.mkdir(licensesPath);
    // }
    if (!instance) {
      const orgInstResult = await Select.instance({ client });
      instance = orgInstResult.instance;
    }
    if (!license.value) {
      await client.instance.issueDownloadLicenseCode({
        instanceId: instance._id,
      });
      const result = await prompt<{ code: string }>([
        {
          type: 'input',
          message: [
            'We need to download a license. To do so we need to verify',
            'your identity. Please enter a 6 digit code from an email',
            'you just received:',
          ].join(' '),
          name: 'code',
        },
      ]);
      const instanceLicense = await client.instance.downloadLicenseWithCode({
        code: result.code,
        instanceId: instance._id,
      });
      license.fileName = `${instance._id}.license`;
      license.value = instanceLicense;
      await Config.server.linux.homeFs.save(
        [licensesPath, license.fileName],
        license.value,
      );
    }

    type DBType = 'auto' | 'mongoAtlas' | 'mongoSelfHosted';
    const dbInfo: {
      type: DBType;
      user: string;
      pass: string;
      name: string;
      cluster?: string;
      host?: string;
      port?: string;
    } = {} as never;

    const instanceFsBase =
      Config.server.linux.homeBase + `/storage/${instance._id}`;
    const instanceFs = createFS({
      base: instanceFsBase,
    });
    if (!(await instanceFs.exist('mongodb'))) {
      await instanceFs.mkdir('mongodb');
    }
    if (!(await instanceFs.exist('fsdb'))) {
      await instanceFs.mkdir('fsdb');
    }

    /**
     * System setup
     */
    await createTasks([
      {
        title: 'Verify BCMS license',
        async task() {
          if (
            license.value.indexOf('---- BEGIN BCMS LICENSE ----') === -1 ||
            license.value.indexOf('---- END BCMS LICENSE ----') === -1 ||
            license.value.split('\n').length !== 23
          ) {
            throw Error(
              [
                `Invalid license format of "${license.fileName}".`,
                'If you did not change the license file and you obtained it',
                'via "https://cloud.thebcms.com", please contact the support.',
              ].join(' '),
            );
          }
        },
      },
      {
        title: 'Prepare BCMS directory.',
        async task() {
          await Config.server.linux.homeFs.save(
            ['licenses', license.fileName],
            license.value,
          );
        },
      },
      {
        title: 'Setup Docker network',
        async task() {
          const exo: ChildProcessOnChunkHelperOutput = {
            out: '',
            err: '',
          };
          await ChildProcess.advancedExec(
            [
              'docker',
              'network',
              'create',
              '-d',
              'bridge',
              '--subnet',
              '10.20.30.0/16',
              '--ip-range',
              '10.20.30.128/24',
              '--gateway',
              '10.20.30.1',
              'bcms',
            ].join(' '),
            {
              onChunk: ChildProcess.onChunkHelper(exo),
              doNotThrowError: true,
            },
          ).awaiter;
          if (exo.err) {
            if (!exo.err.includes('network with name bcms already exists')) {
              throw Error(
                [
                  '[e1] Cannot create "bcms" docker network.',
                  'You will need to create it manually. ---',
                  exo.err,
                ].join(' '),
              );
            }
          } else if (!exo.out) {
            throw Error(
              [
                '[e2] Cannot create "bcms" docker network.',
                'You will need to create it manually.',
              ].join(' '),
            );
          }
        },
      },
      {
        title: 'Setup database',
        async task() {
          let setupDb = true;
          if (await instanceFs.exist('db-info.json', true)) {
            const { yes } = await prompt<{ yes: boolean }>([
              {
                message: [
                  'Database information detected.',
                  'Would you like to setup database again?',
                  'This will delete current database and setup a new one!',
                ].join(' '),
                type: 'confirm',
                name: 'yes',
              },
            ]);
            setupDb = yes;
          }
          if (setupDb) {
            dbInfo.type = (
              await prompt<{
                dbType: 'auto' | 'mongoAtlas' | 'mongoSelfHosted';
              }>([
                {
                  message: 'Which database type would you like to use?',
                  name: 'dbType',
                  type: 'list',
                  choices: [
                    {
                      name: 'Automatic (Recommended) - CLI will setup recommended DB on this server',
                      value: 'auto',
                    },
                    {
                      name: 'MongoDB Cluster - Managed MongoDB database (DBaaS)',
                      value: 'mongoAtlas',
                    },
                    {
                      name: 'MongoDB Self-hosted - You have configured MongoDB on some server',
                      value: 'mongoSelfHosted',
                    },
                  ],
                },
              ])
            ).dbType;
            if (dbInfo.type === 'mongoAtlas') {
              const info = await prompt<{
                user: string;
                pass: string;
                name: string;
                cluster: string;
              }>([
                {
                  message: 'Database username:',
                  type: 'input',
                  name: 'user',
                },
                {
                  message: 'Database user password:',
                  type: 'password',
                  name: 'pass',
                },
                {
                  message: 'Database name:',
                  type: 'input',
                  name: 'name',
                },
                {
                  message: 'Database cluster (ex. my-cluster.mongodb.net):',
                  type: 'input',
                  name: 'cluster',
                },
              ]);
              dbInfo.name = info.name;
              dbInfo.pass = info.pass;
              dbInfo.user = info.user;
              dbInfo.cluster = info.cluster;
            } else if (dbInfo.type === 'mongoSelfHosted') {
              const info = await prompt<{
                user: string;
                pass: string;
                name: string;
                host: string;
                port: string;
              }>([
                {
                  message: 'Database username:',
                  type: 'input',
                  name: 'user',
                },
                {
                  message: 'Database user password:',
                  type: 'password',
                  name: 'pass',
                },
                {
                  message: 'Database name:',
                  type: 'input',
                  name: 'name',
                },
                {
                  message: 'Database host (ex. example.com):',
                  type: 'input',
                  name: 'host',
                },
                {
                  message: 'Database port (default 27017):',
                  type: 'input',
                  name: 'port',
                  default: '27017',
                },
              ]);
              dbInfo.name = info.name;
              dbInfo.pass = info.pass;
              dbInfo.user = info.user;
              dbInfo.host = info.host;
              dbInfo.port = info.port;
            } else if (dbInfo.type === 'auto') {
              const dbContainerName = `bcms-db-${instance._id}`;
              dbInfo.user = 'u_' + randomBytes(8).toString('hex');
              dbInfo.pass = 'p_' + randomBytes(16).toString('hex');
              dbInfo.name = 'admin';
              dbInfo.host = dbContainerName;
              dbInfo.port = '27017';
              if (!(await Docker.image.exists('mongo:7'))) {
                await Docker.image.pull('mongo:7');
              }
              await instanceFs.copy(
                'mongodb',
                `mongodb_${new Date().toISOString()}_bak`,
              );
              await instanceFs.deleteDir('mongodb');
              await instanceFs.mkdir('mongodb');
              if (await Docker.container.exists(dbContainerName)) {
                await Docker.container.stop(dbContainerName);
                await Docker.container.remove(dbContainerName);
              }
              await Docker.container.run({
                args: {
                  '--name': dbContainerName,
                  '-d': [],
                  '--network': 'bcms',
                  '-e': [
                    `MONGO_INITDB_ROOT_USERNAME=${dbInfo.user}`,
                    `MONGO_INITDB_ROOT_PASSWORD=${dbInfo.pass}`,
                  ],
                  '-v': `${instanceFsBase}/mongodb:/data/db`,
                  'mongo:7': [],
                },
              });
              const cronFile = `/var/spool/cron/crontabs/root`;
              let fileContent = '';
              if (!(await Config.server.linux.homeFs.exist(cronFile, true))) {
                await ChildProcess.advancedExec([
                  'touch',
                  cronFile,
                  '&&',
                  `chmod 600 ${cronFile}`,
                ]).awaiter;
              } else {
                fileContent = await Config.server.linux.homeFs.readString(
                  cronFile,
                );
              }
              const dbPart = StringUtility.textBetween(
                fileContent,
                `# ---- DB ${dbContainerName} ----\n`,
                `\n# ---- DB END ${dbContainerName}`,
              );
              if (dbPart) {
                fileContent = fileContent.replace(
                  dbPart,
                  [
                    `@reboot sudo docker start ${dbContainerName}`,
                    `* * * * * sudo docker start ${dbContainerName}`,
                  ].join('\n'),
                );
              } else {
                fileContent += [
                  `# ---- DB ${dbContainerName} ----`,
                  `@reboot sudo docker start ${dbContainerName}`,
                  `* * * * * sudo docker start ${dbContainerName}`,
                  `# ---- DB END ${dbContainerName}\n`,
                ].join('\n');
              }
              await Config.server.linux.homeFs.save(cronFile, fileContent);
            }
            await instanceFs.save(
              'db-info.json',
              JSON.stringify(dbInfo, null, '  '),
            );
          }
        },
      },
    ]).run();
    await Shim.install({ args, client });
    await client.auth.logout();
    console.log('All done!');
  }
}
