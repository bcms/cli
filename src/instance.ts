import { randomBytes } from 'crypto';
import * as path from 'path';
import { Args, createTasks, Select } from './util';
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
import { createFS } from '@banez/fs';
import type { ChildProcessOnChunkHelperOutput } from '@banez/child_process/types';

export class Instance {
  // static async run(_args: Args): Promise<void> {
  //   function execHelper(output: {
  //     out: string;
  //     err: string;
  //   }): (type: 'stdout' | 'stderr', chunk: string) => void {
  //     output.out = '';
  //     output.err = '';
  //     return (type, chunk) => {
  //       if (type === 'stdout') {
  //         output.out += chunk;
  //       } else {
  //         output.err += chunk;
  //       }
  //     };
  //   }
  //   // const osVersion = 'ubuntu';
  //   const rexo = {
  //     out: '',
  //     err: '',
  //   };
  //   await System.exec('docker --version', {
  //     onChunk: execHelper(rexo),
  //     doNotThrowError: true,
  //   }).awaiter;
  //   if (rexo.err) {
  //     if (rexo.err.indexOf('not found')) {
  //       const installDockerResult = await prompt<{ yes: boolean }>([
  //         {
  //           type: 'confirm',
  //           name: 'yes',
  //           message: [
  //             'Docker is not installed on the system.',
  //             'Would you like us to try to install it?',
  //           ].join(' '),
  //         },
  //       ]);
  //       if (!installDockerResult.yes) {
  //         console.log(
  //           [
  //             'Docker is required for the BCMS to run.',
  //             'Install it manually and run "bcms --instance --run" again.',
  //           ].join(' '),
  //         );
  //         return;
  //       }
  //       const installDockerTasks = createTasks([
  //         {
  //           title: 'Updating system packages',
  //           async task() {
  //             await System.spawn('sudo', ['apt', 'update']);
  //           },
  //         },
  //         {
  //           title: 'Install dependency packages',
  //           async task() {
  //             await System.spawn('sudo', [
  //               'apt',
  //               'install',
  //               'apt-transport-https',
  //               'ca-certificates',
  //               'curl',
  //               'software-properties-common',
  //               '-y',
  //             ]);
  //           },
  //         },
  //         {
  //           title: 'Get GPG key for official Docker repository',
  //           async task() {
  //             const exo = {
  //               out: '',
  //               err: '',
  //             };
  //             await System.exec(
  //               [
  //                 'curl',
  //                 '-fsSL https://download.docker.com/linux/ubuntu/gpg',
  //                 '|',
  //                 'sudo',
  //                 'apt-key',
  //                 'add',
  //                 '-',
  //               ].join(' '),
  //               {
  //                 onChunk: execHelper(exo),
  //                 env: {
  //                   APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE: 'DontWarn',
  //                 },
  //               },
  //             ).awaiter;
  //             if (exo.out.indexOf('OK') === -1 || !exo.out) {
  //               console.error('Failed to get GPG key.');
  //               throw Error(exo.err);
  //             }
  //           },
  //         },
  //         {
  //           title: 'Add the Docker repository to APT',
  //           async task() {
  //             const exo = {
  //               out: '',
  //               err: '',
  //             };
  //             await System.exec(
  //               [
  //                 'sudo',
  //                 'add-apt-repository',
  //                 '"deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"',
  //               ].join(' '),
  //               { onChunk: execHelper(exo) },
  //             ).awaiter;
  //             console.log(exo.out);
  //           },
  //         },
  //         {
  //           title: 'Update packages',
  //           async task() {
  //             await System.spawn('sudo', ['apt', 'update']);
  //           },
  //         },
  //         {
  //           title: 'Install Docker',
  //           async task() {
  //             await System.spawn('sudo', ['apt', 'install', 'docker-ce', '-y']);
  //           },
  //         },
  //         {
  //           title: 'Check if Docker is installed and running',
  //           async task() {
  //             const exo = {
  //               out: '',
  //               err: '',
  //             };
  //             await System.exec('sudo systemctl status docker', {
  //               onChunk: execHelper(exo),
  //             }).awaiter;
  //             if (exo.err) {
  //               throw Error(exo.err);
  //             }
  //             if (
  //               exo.out.indexOf('docker.service') !== -1 &&
  //               exo.out.indexOf('Active: active (running)')
  //             ) {
  //               console.log('Docker is successfully installed and running');
  //             } else {
  //               console.log(exo.out);
  //               const cont = await prompt<{ yes: boolean }>([
  //                 {
  //                   type: 'confirm',
  //                   name: 'yes',
  //                   message: [
  //                     'It seams that the Docker was installed',
  //                     'but output cannot be verified.',
  //                     'Would you like to continue?',
  //                   ].join(' '),
  //                 },
  //               ]);
  //               if (!cont.yes) {
  //                 throw Error(
  //                   'Failed to install the Docker. Probably partially installed.',
  //                 );
  //               }
  //             }
  //           },
  //         },
  //       ]);
  //       await installDockerTasks.run();
  //     } else {
  //       throw Error(rexo.err);
  //     }
  //   }
  //   let licenseFileName = '';
  //   const mainTasks = createTasks([
  //     {
  //       title: 'Verify BCMS license',
  //       async task() {
  //         const files = await System.readdir(process.cwd());
  //         const licenseName = files.find((e) => e.endsWith('.license'));
  //         if (!licenseName) {
  //           console.log('Files in current directory:\n\t', files.join('\n\t'));
  //           throw Error(
  //             [
  //               'Cannot find any file with ".license" extension.',
  //               'Have you coped the license file from the',
  //               'Email to the current location on the server?',
  //               'Please check that and run installation script again.',
  //             ].join(' '),
  //           );
  //         }
  //         licenseFileName = licenseName;
  //         const license = await System.readFile(
  //           path.join(process.cwd(), licenseFileName),
  //         );
  //         if (
  //           license.indexOf('---- BEGIN BCMS LICENSE ----') === -1 ||
  //           license.indexOf('---- END BCMS LICENSE ----') === -1 ||
  //           license.split('\n').length !== 24
  //         ) {
  //           throw Error(
  //             [
  //               `Invalid license format of "${licenseFileName}".`,
  //               'If you did not change the license file and you obtained it',
  //               'via "https://cloud.thebcms.com", please contact the support.',
  //             ].join(' '),
  //           );
  //         }
  //       },
  //     },
  //     {
  //       title: 'Create BCMS user',
  //       async task() {
  //         const exo = {
  //           out: '',
  //           err: '',
  //         };
  //         await System.exec(['id', '-u', 'bcms'].join(' '), {
  //           onChunk: execHelper(exo),
  //           doNotThrowError: true,
  //         }).awaiter;
  //         if (exo.err) {
  //           if (exo.err.indexOf('no such user') !== -1) {
  //             await System.spawn('sudo', [
  //               'adduser',
  //               '--disabled-password',
  //               '--gecos',
  //               '"BCMS"',
  //               'bcms',
  //             ]);
  //           } else {
  //             throw Error(exo.err);
  //           }
  //         } else if (!exo.out) {
  //           throw Error(
  //             [
  //               'Cannot find/create user "bcms".',
  //               'You will need to create it manually.',
  //             ].join(' '),
  //           );
  //         }
  //       },
  //     },
  //     {
  //       title: 'Add BCMS user to the Docker group',
  //       async task() {
  //         await System.spawn('sudo', ['usermod', '-aG', 'docker', 'bcms']);
  //       },
  //     },
  //     {
  //       title: 'Prepare BCMS users home directory.',
  //       async task() {
  //         if (!(await System.exist('/home/bcms/storage'))) {
  //           await System.spawn('mkdir', ['/home/bcms/storage']);
  //           await System.spawn('chown', [
  //             '-R',
  //             'bcms:bcms',
  //             '/home/bcms/storage',
  //           ]);
  //         }
  //         if (!(await System.exist('/home/bcms/licenses'))) {
  //           await System.spawn('mkdir', ['/home/bcms/licenses']);
  //           await System.spawn('chown', [
  //             '-R',
  //             'bcms:bcms',
  //             '/home/bcms/licenses',
  //           ]);
  //         }
  //         await fse.copy(
  //           path.join(process.cwd(), licenseFileName),
  //           `/home/bcms/licenses/${licenseFileName}`,
  //         );
  //       },
  //     },
  //     {
  //       title: 'Create BCMS user cronjobs',
  //       async task() {
  //         const cronFile = '/var/spool/cron/crontabs/bcms';
  //         if (!(await System.exist(cronFile))) {
  //           await System.exec(
  //             ['touch', cronFile, '&&', `chmod 600 ${cronFile}`].join(' '),
  //           ).awaiter;
  //         }
  //         await System.writeFile(
  //           cronFile,
  //           [
  //             '@reboot docker start bcms-shim',
  //             '0 0 * * * docker start bcms-shim',
  //           ].join('\n'),
  //         );
  //       },
  //     },
  //     {
  //       title: 'Pull Docker BCMS Shim image',
  //       async task() {
  //         await System.spawn('docker', ['pull', 'becomes/cms-shim']);
  //       },
  //     },
  //     {
  //       title: 'Run BCMS Shim container',
  //       async task() {
  //         await System.exec(
  //           [
  //             'cd /home/bcms',
  //             '&&',
  //             'su bcms -y',
  //             '&&',
  //             'ls -l',
  //             '&&',
  //             'docker',
  //             'run',
  //             '-d',
  //             '-p',
  //             '1279:1279',
  //             '-v',
  //             '/var/run/docker.sock:/var/run/docker.sock',
  //             '-v',
  //             '/home/bcms/storage:/app/storage',
  //             '-v',
  //             '/home/bcms/licenses:/app/licenses',
  //             '-e',
  //             'PORT=1279',
  //             '-e',
  //             'BCMS_CLOUD_DOMAIN=cloud.thebcms.com',
  //             '-e',
  //             'BCMS_CLOUD_PORT=443',
  //             '-e',
  //             'BCMS_MANAGE=true',
  //             '--name',
  //             'bcms-shim',
  //             'becomes/cms-shim',
  //             '&&',
  //             'ls -l',
  //           ].join(' '),
  //           {
  //             onChunk(type, chunk) {
  //               process[type].write(chunk);
  //             },
  //           },
  //         ).awaiter;
  //       },
  //     },
  //     {
  //       title: 'Tail the output for 5s',
  //       async task() {
  //         const proc = System.exec('docker logs --tail 500 -f bcms-shim', {
  //           onChunk(type, chunk) {
  //             process[type].write(chunk);
  //           },
  //           doNotThrowError: true,
  //         });
  //         setTimeout(() => {
  //           proc.stop();
  //         }, 5000);
  //         await proc.awaiter;
  //       },
  //     },
  //     {
  //       title: 'Cleanup',
  //       async task() {
  //         await System.spawn('rm', ['/root/install']);
  //         await System.spawn('rm', [`/root/${licenseFileName}`]);
  //       },
  //     },
  //   ]);
  //   await mainTasks.run();
  // }
  static async install({
    args,
    client,
  }: {
    args: Args;
    client: ApiClient;
  }): Promise<void> {
    const rootFs = createFS({
      base: Config.fsDir,
    });
    const homeFs = createFS({
      base: '/home/bcms',
    });
    if (!(await client.isLoggedIn())) {
      await login({ args, client });
    }

    // const osVersion = 'ubuntu';
    const rexo = {
      out: '',
      err: '',
    };
    /**
     * Check Docker
     */
    await ChildProcess.advancedExec('docker --version', {
      onChunk: ChildProcess.onChunkHelper(rexo),
      doNotThrowError: true,
    }).awaiter;
    if (rexo.err) {
      if (rexo.err.indexOf('not found')) {
        const installDockerResult = await prompt<{ yes: boolean }>([
          {
            type: 'confirm',
            name: 'yes',
            message: [
              'Docker is not installed on the system.',
              'BCMS required Docker to run. We can install it for you.',
            ].join(' '),
          },
        ]);
        if (!installDockerResult.yes) {
          console.log(
            [
              'Docker is required for the BCMS to run.',
              'Install it manually and run "bcms --instance --run" again.',
            ].join(' '),
          );
          return;
        }
        const installDockerTasks = createTasks([
          {
            title: 'Updating system packages',
            async task() {
              await ChildProcess.spawn('sudo', ['apt', 'update']);
            },
          },
          {
            title: 'Install dependency packages',
            async task() {
              await ChildProcess.spawn('sudo', [
                'apt',
                'install',
                'apt-transport-https',
                'ca-certificates',
                'curl',
                'software-properties-common',
                '-y',
              ]);
            },
          },
          {
            title: 'Get GPG key for official Docker repository',
            async task() {
              const exo = {
                out: '',
                err: '',
              };
              await ChildProcess.advancedExec(
                [
                  'curl',
                  '-fsSL https://download.docker.com/linux/ubuntu/gpg',
                  '|',
                  'sudo',
                  'apt-key',
                  'add',
                  '-',
                ].join(' '),
                {
                  onChunk: ChildProcess.onChunkHelper(exo),
                  env: {
                    APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE: 'DontWarn',
                  },
                },
              ).awaiter;
              if (exo.out.indexOf('OK') === -1 || !exo.out) {
                console.error('Failed to get GPG key.');
                throw Error(exo.err);
              }
            },
          },
          {
            title: 'Add the Docker repository to APT',
            async task() {
              const exo = {
                out: '',
                err: '',
              };
              await ChildProcess.advancedExec(
                [
                  'sudo',
                  'add-apt-repository',
                  '"deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"',
                ].join(' '),
                { onChunk: ChildProcess.onChunkHelper(exo) },
              ).awaiter;
              console.log(exo.out);
            },
          },
          {
            title: 'Update packages',
            async task() {
              await ChildProcess.spawn('sudo', ['apt', 'update']);
            },
          },
          {
            title: 'Install Docker',
            async task() {
              await ChildProcess.spawn('sudo', [
                'apt',
                'install',
                'docker-ce',
                '-y',
              ]);
            },
          },
          {
            title: 'Check if Docker is installed and running',
            async task() {
              const exo = {
                out: '',
                err: '',
              };
              await ChildProcess.advancedExec('sudo systemctl status docker', {
                onChunk: ChildProcess.onChunkHelper(exo),
              }).awaiter;
              if (exo.err) {
                throw Error(exo.err);
              }
              if (
                exo.out.indexOf('docker.service') !== -1 &&
                exo.out.indexOf('Active: active (running)')
              ) {
                console.log('Docker is successfully installed and running');
              } else {
                console.log(exo.out);
                const cont = await prompt<{ yes: boolean }>([
                  {
                    type: 'confirm',
                    name: 'yes',
                    message: [
                      'It seams that the Docker was installed',
                      'but output cannot be verified.',
                      'Would you like to continue?',
                    ].join(' '),
                  },
                ]);
                if (!cont.yes) {
                  throw Error(
                    'Failed to install the Docker. Probably partially installed.',
                  );
                }
              }
            },
          },
        ]);
        await installDockerTasks.run();
      } else {
        throw Error(rexo.err);
      }
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
    // const licensesPath = path.join(Config.fsDir, 'licenses');
    const licensesPath = 'licenses';
    if (await rootFs.exist(licensesPath)) {
      if (!instance || !org) {
        const files = await rootFs.readdir(licensesPath);
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
          license.value = await rootFs.readString([
            licensesPath,
            license.fileName,
          ]);
        }
      } else if (
        await rootFs.exist([licensesPath, instance._id + '.license'], true)
      ) {
        license.fileName = instance._id + '.license';
        license.value = await rootFs.readString([
          licensesPath,
          license.fileName,
        ]);
      }
    } else {
      await rootFs.mkdir(licensesPath);
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
      await rootFs.save([licensesPath, license.fileName], license.value);
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

    /**
     * System setup
     */
    const mainTasks = createTasks([
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
        title: 'Create BCMS user',
        async task() {
          const exo = {
            out: '',
            err: '',
          };
          await ChildProcess.advancedExec(['id', '-u', 'bcms'], {
            onChunk: ChildProcess.onChunkHelper(exo),
            doNotThrowError: true,
          }).awaiter;
          if (exo.err) {
            if (exo.err.indexOf('no such user') !== -1) {
              await ChildProcess.spawn('sudo', [
                'adduser',
                '--disabled-password',
                '--gecos',
                '"BCMS"',
                'bcms',
              ]);
            } else {
              throw Error(exo.err);
            }
          } else if (!exo.out) {
            throw Error(
              [
                'Cannot find/create user "bcms".',
                'You will need to create it manually.',
              ].join(' '),
            );
          }
        },
      },
      {
        title: 'Add BCMS user to the Docker group',
        async task() {
          await ChildProcess.spawn('sudo', [
            'usermod',
            '-aG',
            'docker',
            'bcms',
          ]);
        },
      },
      {
        title: 'Prepare BCMS users home directory.',
        async task() {
          if (!(await homeFs.exist('storage'))) {
            await homeFs.mkdir('storage');
            await ChildProcess.spawn('chown', [
              '-R',
              'bcms:bcms',
              '/home/bcms/storage',
            ]);
          }
          if (!(await rootFs.exist('licenses'))) {
            await homeFs.mkdir('licenses');
          }
          await rootFs.save(['licenses', license.fileName], license.value);
          await ChildProcess.spawn('chown', [
            '-R',
            'bcms:bcms',
            `/home/bcms/licenses`,
          ]);
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
          if (await homeFs.exist(['storage', instance._id, 'db-info.json'])) {
            const { yes } = await prompt<{ yes: boolean }>([
              {
                message: [
                  'Database information detected.',
                  'Would you like to setup database again?',
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
              dbInfo.user = 'u_' + randomBytes(8).toString('hex');
              dbInfo.pass = 'p_' + randomBytes(16).toString('hex');
              dbInfo.name = `db_${instance._id}`;
              if (!(await Docker.image.exists('mongo:5-focal'))) {
                await Docker.image.pull('mongo:5-focal');
              }
              const rootUser: {
                name: string;
                pass: string;
              } = {
                name: '',
                pass: '',
              };
              if (await Docker.container.exists('bcms-db')) {
                await Docker.container.stop('bcms-db');
                await Docker.container.remove('bcms-db');
              }
              if (await homeFs.exist(['storage', 'db-root.json'], true)) {
                const user = JSON.parse(
                  await homeFs.readString(['storage', 'db-root.json']),
                );
                rootUser.name = user.name;
                rootUser.pass = user.pass;
              } else {
                rootUser.name = 'u_' + randomBytes(8).toString('hex');
                rootUser.pass = 'p_' + randomBytes(16).toString('hex');
              }
              if (!(await rootFs.exist('mongodb'))) {
                await rootFs.mkdir('mongodb');
              }
              // await rootFs.save(
              //   ['mongodb', 'setup.sh'],
              //   `mongo -u ${rootUser.name} -p ${rootUser.pass} --eval 'db.createUser({user: "${dbInfo.user}", pwd: "${dbInfo.pass}", roles: [{role: "readWrite", db: "db_${instance._id}"}]})' admin`,
              // );
              await Docker.container.run({
                args: {
                  '--name': ['bcms-db'],
                  '-d': [],
                  '--network': ['bcms'],
                  '-e': [
                    `MONGO_INITDB_ROOT_USERNAME=${rootUser.name}`,
                    `MONGO_INITDB_ROOT_PASSWORD=${rootUser.pass}`,
                  ],
                  '-v': [`${path.join(Config.fsDir, 'mongodb')}:/data/db`],
                  'mongo:5-focal': [],
                },
              });
              await homeFs.save(
                ['storage', 'db-root.json'],
                JSON.stringify(rootUser, null, '  '),
              );
              // const cmd = [
              //   'docker',
              //   'exec',
              //   'bcms-db',
              //   'bash',
              //   '-c',
              //   `"sh /data/db/setup.sh"`,
              // ];
              // const exo: ChildProcessOnChunkHelperOutput = {
              //   err: '',
              //   out: '',
              // };
              // await ChildProcess.advancedExec(cmd, {
              //   onChunk: ChildProcess.onChunkHelper(exo),
              //   doNotThrowError: true,
              // }).awaiter;
              // if (exo.err) {
              //   console.error('ERROR ........................................');
              //   console.error(exo.err);
              //   throw Error();
              // } else {
              //   console.log('OUTPUT ........................');
              //   console.log(exo.out);
              // }
              // await rootFs.deleteFile(['mongodb', 'setup.sh']);
            }
            await homeFs.save(
              ['storage', instance._id, 'db-info.json'],
              JSON.stringify(dbInfo, null, '  '),
            );
            await ChildProcess.spawn('chown', [
              '-R',
              'bcms:bcms',
              path.join(Config.fsDir, instance._id, 'db-info.json'),
            ]);
          }
        },
      },
      {
        title: 'Pull Docker BCMS Shim image',
        async task() {
          await ChildProcess.spawn('docker', ['pull', 'becomes/cms-shim']);
        },
      },
      {
        title: 'Run BCMS Shim container',
        async task() {
          if (await Docker.container.exists('bcms-shim')) {
            await Docker.container.stop('bcms-shim', {
              doNotThrowError: true,
              onChunk: (type, chunk) => {
                process[type].write(chunk);
              },
            });
            await Docker.container.remove('bcms-shim', {
              doNotThrowError: true,
              onChunk: (type, chunk) => {
                process[type].write(chunk);
              },
            });
          }
          await ChildProcess.advancedExec(
            [
              'cd /home/bcms',
              '&&',
              'ls -l',
              '&&',
              'docker',
              'run',
              '-d',
              '--network',
              'bcms',
              '-v',
              '/var/run/docker.sock:/var/run/docker.sock',
              '-v',
              '/home/bcms/storage:/app/storage',
              '-v',
              '/home/bcms/licenses:/app/licenses',
              '-e',
              'PORT=1279',
              '-e',
              'BCMS_CLOUD_DOMAIN=cloud.thebcms.com',
              '-e',
              'BCMS_CLOUD_PORT=443',
              '-e',
              'BCMS_MANAGE=true',
              '--name',
              'bcms-shim',
              '--hostname',
              'bcms-shim',
              'becomes/cms-shim',
              '&&',
              'ls -l',
            ].join(' '),
            {
              onChunk(type, chunk) {
                process[type].write(chunk);
              },
            },
          ).awaiter;
        },
      },
      // {
      //   title: 'Tail the output for 5s',
      //   async task() {
      //     const proc = ChildProcess.advancedExec('docker logs --tail 500 -f bcms-shim', {
      //       onChunk(type, chunk) {
      //         process[type].write(chunk);
      //       },
      //       doNotThrowError: true,
      //     });
      //     setTimeout(() => {
      //       proc.stop();
      //     }, 5000);
      //     await proc.awaiter;
      //   },
      // },
      {
        title: 'Create BCMS user cronjobs',
        async task() {
          const cronFile = '/var/spool/cron/crontabs/bcms';
          if (!(await rootFs.exist(cronFile, true))) {
            await ChildProcess.advancedExec([
              'touch',
              cronFile,
              '&&',
              `chmod 600 ${cronFile}`,
            ]).awaiter;
          }
          await rootFs.save(
            cronFile,
            [
              dbInfo.type === 'auto'
                ? '@reboot docker start bcms-db\n0 0 * * * docker start bcms-db'
                : undefined,
              '@reboot docker start bcms-shim',
              '0 0 * * * docker start bcms-shim',
            ]
              .filter((e) => e)
              .join('\n'),
          );
        },
      },
    ]);
    await mainTasks.run();
    console.log('All done!');
  }
}
