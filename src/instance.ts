import { randomBytes } from 'crypto';
import { Args, DockerUtil, Select } from './util';
import { prompt } from 'inquirer';
import type {
  ApiClient,
  InstanceProtected,
  Org,
} from '@becomes/cms-cloud-client/types';
import { login } from './login';
import { Config } from './config';
import { Docker } from '@banez/docker';
import { ChildProcess } from '@banez/child_process';
import type { ChildProcessOnChunkHelperOutput } from '@banez/child_process/types';
import { Shim } from './shim';
import { createTasks } from '@banez/npm-tool';
import { createFS } from '@banez/fs';

export class Instance {
  static async install({
    args,
    client,
  }: {
    args: Args;
    client: ApiClient;
  }): Promise<void> {
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }

    if (!(await DockerUtil.setup())) {
      return;
    }

    /**
     * Get license
     */
    const instances = await client.instance.getAll();
    let instance: InstanceProtected = args.instance
      ? (instances.find((e) => e._id === args.instance) as InstanceProtected)
      : (null as never);
    let org: Org | null = null;
    if (instance) {
      try {
        org = await client.org.get({ id: instance.org.id });
      } catch (_error) {
        // Do nothing
      }
    }
    const license = {
      fileName: '',
      value: '',
    };
    const licensesPath = 'licenses';
    if (await Config.server.linux.homeFs.exist(licensesPath)) {
      if (!instance || !org) {
        const files = await Config.server.linux.homeFs.readdir(licensesPath);
        const options: Array<{
          text: string;
          instance: InstanceProtected;
          org: Org;
        }> = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const instanceId = file.split('.')[0];
          const _instance = instances.find((e) => e._id === instanceId);
          if (_instance) {
            const _org = await client.org.get({ id: _instance.org.id });
            if (_org) {
              options.push({
                instance: _instance,
                org: _org,
                text: `${_org.name} - ${_instance.name}`,
              });
            }
          }
        }
        const result = await prompt<{
          select: {
            instance?: InstanceProtected;
            org?: Org;
          };
        }>([
          {
            type: 'list',
            message: 'Which license would you like to use?',
            name: 'select',
            choices: [
              ...options.map((e) => {
                return {
                  name: e.text,
                  value: {
                    org: e.org,
                    instance: e.instance,
                  },
                };
              }),
              {
                name: 'Other...',
                value: {},
              },
            ],
          },
        ]);
        if (result.select.instance && result.select.org) {
          org = result.select.org;
          instance = result.select.instance;
          license.fileName = instance._id + '.license';
          license.value = await Config.server.linux.homeFs.readString([
            licensesPath,
            license.fileName,
          ]);
        }
      } else if (
        await Config.server.linux.homeFs.exist(
          [licensesPath, instance._id + '.license'],
          true,
        )
      ) {
        license.fileName = instance._id + '.license';
        license.value = await Config.server.linux.homeFs.readString([
          licensesPath,
          license.fileName,
        ]);
      }
    } else {
      await Config.server.linux.homeFs.mkdir(licensesPath);
    }
    if (!instance || !org) {
      const orgInstResult = await Select.orgAndInstance({ client });
      instance = orgInstResult.instance;
      org = orgInstResult.org;
    }
    if (!license.value) {
      await client.instance.issueDownloadLicenseCode({
        instanceId: instance._id,
        orgId: org._id,
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
        orgId: org._id,
      });
      license.fileName = `${instanceLicense.id}.license`;
      license.value = instanceLicense.key;
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
                      name: 'Automatic - CLI will setup recommended DB on your server',
                      value: 'auto',
                    },
                    {
                      name: 'MongoDB Atlas',
                      value: 'mongoAtlas',
                    },
                    {
                      name: 'MongoDB Self-hosted',
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
              if (!(await Docker.image.exists('mongo:5-focal'))) {
                await Docker.image.pull('mongo:5-focal');
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
                  'mongo:5-focal': [],
                },
              });
              const cronFile = `/var/spool/cron/crontabs/${dbContainerName}`;
              if (!(await Config.server.linux.homeFs.exist(cronFile, true))) {
                await ChildProcess.advancedExec([
                  'touch',
                  cronFile,
                  '&&',
                  `chmod 600 ${cronFile}`,
                ]).awaiter;
              }
              await Config.server.linux.homeFs.save(
                cronFile,
                [
                  `@reboot docker start ${dbContainerName}`,
                  `* * * * * docker start ${dbContainerName}\n`,
                ].join('\n'),
              );
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
    console.log('All done!');
  }
}
