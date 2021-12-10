import * as path from 'path';
import * as fse from 'fs-extra';
import { Args, createTasks, Select, System } from './util';
import { prompt } from 'inquirer';
import type {
  ApiClient,
  InstanceProtected,
  Org,
} from '@becomes/cms-cloud-client/types';
import { login } from './login';
import { Config } from './config';

export class Instance {
  static async run(_args: Args): Promise<void> {
    function execHelper(output: {
      out: string;
      err: string;
    }): (type: 'stdout' | 'stderr', chunk: string) => void {
      output.out = '';
      output.err = '';
      return (type, chunk) => {
        if (type === 'stdout') {
          output.out += chunk;
        } else {
          output.err += chunk;
        }
      };
    }
    // const osVersion = 'ubuntu';
    const rexo = {
      out: '',
      err: '',
    };
    await System.exec('docker --version', {
      onChunk: execHelper(rexo),
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
              'Would you like us to try to install it?',
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
              await System.spawn('sudo', ['apt', 'update']);
            },
          },
          {
            title: 'Install dependency packages',
            async task() {
              await System.spawn('sudo', [
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
              await System.exec(
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
                  onChunk: execHelper(exo),
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
              await System.exec(
                [
                  'sudo',
                  'add-apt-repository',
                  '"deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"',
                ].join(' '),
                { onChunk: execHelper(exo) },
              ).awaiter;
              console.log(exo.out);
            },
          },
          {
            title: 'Update packages',
            async task() {
              await System.spawn('sudo', ['apt', 'update']);
            },
          },
          {
            title: 'Install Docker',
            async task() {
              await System.spawn('sudo', ['apt', 'install', 'docker-ce', '-y']);
            },
          },
          {
            title: 'Check if Docker is installed and running',
            async task() {
              const exo = {
                out: '',
                err: '',
              };
              await System.exec('sudo systemctl status docker', {
                onChunk: execHelper(exo),
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
    let licenseFileName = '';
    const mainTasks = createTasks([
      {
        title: 'Verify BCMS license',
        async task() {
          const files = await System.readdir(process.cwd());
          const licenseName = files.find((e) => e.endsWith('.license'));
          if (!licenseName) {
            console.log('Files in current directory:\n\t', files.join('\n\t'));
            throw Error(
              [
                'Cannot find any file with ".license" extension.',
                'Have you coped the license file from the',
                'Email to the current location on the server?',
                'Please check that and run installation script again.',
              ].join(' '),
            );
          }
          licenseFileName = licenseName;
          const license = await System.readFile(
            path.join(process.cwd(), licenseFileName),
          );
          if (
            license.indexOf('---- BEGIN BCMS LICENSE ----') === -1 ||
            license.indexOf('---- END BCMS LICENSE ----') === -1 ||
            license.split('\n').length !== 24
          ) {
            throw Error(
              [
                `Invalid license format of "${licenseFileName}".`,
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
          await System.exec(['id', '-u', 'bcms'].join(' '), {
            onChunk: execHelper(exo),
            doNotThrowError: true,
          }).awaiter;
          if (exo.err) {
            if (exo.err.indexOf('no such user') !== -1) {
              await System.spawn('sudo', [
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
          await System.spawn('sudo', ['usermod', '-aG', 'docker', 'bcms']);
        },
      },
      {
        title: 'Prepare BCMS users home directory.',
        async task() {
          if (!(await System.exist('/home/bcms/storage'))) {
            await System.spawn('mkdir', ['/home/bcms/storage']);
            await System.spawn('chown', [
              '-R',
              'bcms:bcms',
              '/home/bcms/storage',
            ]);
          }
          if (!(await System.exist('/home/bcms/licenses'))) {
            await System.spawn('mkdir', ['/home/bcms/licenses']);
            await System.spawn('chown', [
              '-R',
              'bcms:bcms',
              '/home/bcms/licenses',
            ]);
          }
          await fse.copy(
            path.join(process.cwd(), licenseFileName),
            `/home/bcms/licenses/${licenseFileName}`,
          );
        },
      },
      {
        title: 'Create BCMS user cronjobs',
        async task() {
          const cronFile = '/var/spool/cron/crontabs/bcms';
          if (!(await System.exist(cronFile))) {
            await System.exec(
              ['touch', cronFile, '&&', `chmod 600 ${cronFile}`].join(' '),
            ).awaiter;
          }
          await System.writeFile(
            cronFile,
            [
              '@reboot docker start bcms-shim',
              '0 0 * * * docker start bcms-shim',
            ].join('\n'),
          );
        },
      },
      {
        title: 'Pull Docker BCMS Shim image',
        async task() {
          await System.spawn('docker', ['pull', 'becomes/cms-shim']);
        },
      },
      {
        title: 'Run BCMS Shim container',
        async task() {
          await System.exec(
            [
              'cd /home/bcms',
              '&&',
              'su bcms -y',
              '&&',
              'ls -l',
              '&&',
              'docker',
              'run',
              '-d',
              '-p',
              '1279:1279',
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
      {
        title: 'Tail the output for 5s',
        async task() {
          const proc = System.exec('docker logs --tail 500 -f bcms-shim', {
            onChunk(type, chunk) {
              process[type].write(chunk);
            },
            doNotThrowError: true,
          });
          setTimeout(() => {
            proc.stop();
          }, 5000);
          await proc.awaiter;
        },
      },
      {
        title: 'Cleanup',
        async task() {
          await System.spawn('rm', ['/root/install']);
          await System.spawn('rm', [`/root/${licenseFileName}`]);
        },
      },
    ]);
    await mainTasks.run();
  }
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

    // const osVersion = 'ubuntu';
    const rexo = {
      out: '',
      err: '',
    };
    /**
     * Check Docker
     */
    await System.exec('docker --version', {
      onChunk: System.execHelper(rexo),
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
              'Would you like us to try to install it?',
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
              await System.spawn('sudo', ['apt', 'update']);
            },
          },
          {
            title: 'Install dependency packages',
            async task() {
              await System.spawn('sudo', [
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
              await System.exec(
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
                  onChunk: System.execHelper(exo),
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
              await System.exec(
                [
                  'sudo',
                  'add-apt-repository',
                  '"deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"',
                ].join(' '),
                { onChunk: System.execHelper(exo) },
              ).awaiter;
              console.log(exo.out);
            },
          },
          {
            title: 'Update packages',
            async task() {
              await System.spawn('sudo', ['apt', 'update']);
            },
          },
          {
            title: 'Install Docker',
            async task() {
              await System.spawn('sudo', ['apt', 'install', 'docker-ce', '-y']);
            },
          },
          {
            title: 'Check if Docker is installed and running',
            async task() {
              const exo = {
                out: '',
                err: '',
              };
              await System.exec('sudo systemctl status docker', {
                onChunk: System.execHelper(exo),
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
    let instance: InstanceProtected | null | undefined = args.instance
      ? instances.find((e) => e._id === args.instance)
      : null;
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
    const licensesPath = path.join(Config.fsDir, 'licenses');
    if (await System.exist(licensesPath)) {
      if (!instance || !org) {
        const files = await System.readdir(licensesPath);
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
          license.value = await System.readFile(
            path.join(licensesPath, license.fileName),
          );
        }
      } else if (
        await System.exist(
          path.join(licensesPath, instance._id + '.license'),
          true,
        )
      ) {
        license.fileName = instance._id + '.license';
        license.value = await System.readFile(
          path.join(licensesPath, license.fileName),
        );
      }
    } else {
      await System.mkdir(licensesPath);
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
          message: 'Enter a 6 digit code from email: ',
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
      await System.writeFile(
        path.join(licensesPath, license.fileName),
        license.value,
      );
    }

    /**
     * System setup
     */
    const mainTasks = createTasks([
      // {
      //   title: 'Verify BCMS license',
      //   async task() {
      //     if (
      //       license.value.indexOf('---- BEGIN BCMS LICENSE ----') === -1 ||
      //       license.value.indexOf('---- END BCMS LICENSE ----') === -1 ||
      //       license.value.split('\n').length !== 24
      //     ) {
      //       throw Error(
      //         [
      //           `Invalid license format of "${license.fileName}".`,
      //           'If you did not change the license file and you obtained it',
      //           'via "https://cloud.thebcms.com", please contact the support.',
      //         ].join(' '),
      //       );
      //     }
      //   },
      // },
      // {
      //   title: 'Create BCMS user',
      //   async task() {
      //     const exo = {
      //       out: '',
      //       err: '',
      //     };
      //     await System.exec(['id', '-u', 'bcms'].join(' '), {
      //       onChunk: System.execHelper(exo),
      //       doNotThrowError: true,
      //     }).awaiter;
      //     if (exo.err) {
      //       if (exo.err.indexOf('no such user') !== -1) {
      //         await System.spawn('sudo', [
      //           'adduser',
      //           '--disabled-password',
      //           '--gecos',
      //           '"BCMS"',
      //           'bcms',
      //         ]);
      //       } else {
      //         throw Error(exo.err);
      //       }
      //     } else if (!exo.out) {
      //       throw Error(
      //         [
      //           'Cannot find/create user "bcms".',
      //           'You will need to create it manually.',
      //         ].join(' '),
      //       );
      //     }
      //   },
      // },
      // {
      //   title: 'Add BCMS user to the Docker group',
      //   async task() {
      //     await System.spawn('sudo', ['usermod', '-aG', 'docker', 'bcms']);
      //   },
      // },
      // {
      //   title: 'Prepare BCMS users home directory.',
      //   async task() {
      //     if (!(await System.exist('/home/bcms/storage'))) {
      //       await System.spawn('mkdir', ['/home/bcms/storage']);
      //       await System.spawn('chown', [
      //         '-R',
      //         'bcms:bcms',
      //         '/home/bcms/storage',
      //       ]);
      //     }
      //     if (!(await System.exist('/home/bcms/licenses'))) {
      //       await System.spawn('mkdir', ['/home/bcms/licenses']);
      //       await System.spawn('chown', [
      //         '-R',
      //         'bcms:bcms',
      //         '/home/bcms/licenses',
      //       ]);
      //     }
      //     await System.writeFile(
      //       `/home/bcms/licenses/${license.fileName}`,
      //       license.value,
      //     );
      //     await System.spawn('chown', [
      //       '-R',
      //       'bcms:bcms',
      //       `/home/bcms/licenses/${license.fileName}`,
      //     ]);
      //   },
      // },
      // {
      //   title: 'Pull Docker BCMS Shim image',
      //   async task() {
      //     await System.spawn('docker', ['pull', 'becomes/cms-shim']);
      //   },
      // },
      {
        title: 'Setup Docker network',
        async task() {
          const exo = {
            out: '',
            err: '',
          };
          await System.exec(
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
              onChunk: System.execHelper(exo),
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
          const databaseType = (
            await prompt<{ databaseType: string }>([
              {
                message: 'Which database would you like to use?',
                name: 'databaseType',
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
          ).databaseType;
          console.log(databaseType);
        },
      },
      // {
      //   title: 'Run BCMS Shim container',
      //   async task() {
      //     await System.exec(
      //       [
      //         'cd /home/bcms',
      //         '&&',
      //         'su bcms -y',
      //         '&&',
      //         'ls -l',
      //         '&&',
      //         'docker',
      //         'run',
      //         '-d',
      //         '-p',
      //         '1279:1279',
      //         '-v',
      //         '/var/run/docker.sock:/var/run/docker.sock',
      //         '-v',
      //         '/home/bcms/storage:/app/storage',
      //         '-v',
      //         '/home/bcms/licenses:/app/licenses',
      //         '-e',
      //         'PORT=1279',
      //         '-e',
      //         'BCMS_CLOUD_DOMAIN=cloud.thebcms.com',
      //         '-e',
      //         'BCMS_CLOUD_PORT=443',
      //         '-e',
      //         'BCMS_MANAGE=true',
      //         '--name',
      //         'bcms-shim',
      //         'becomes/cms-shim',
      //         '&&',
      //         'ls -l',
      //       ].join(' '),
      //       {
      //         onChunk(type, chunk) {
      //           process[type].write(chunk);
      //         },
      //       },
      //     ).awaiter;
      //   },
      // },
      // {
      //   title: 'Tail the output for 5s',
      //   async task() {
      //     const proc = System.exec('docker logs --tail 500 -f bcms-shim', {
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
      // {
      //   title: 'Create BCMS user cronjobs',
      //   async task() {
      //     const cronFile = '/var/spool/cron/crontabs/bcms';
      //     if (!(await System.exist(cronFile))) {
      //       await System.exec(
      //         ['touch', cronFile, '&&', `chmod 600 ${cronFile}`].join(' '),
      //       ).awaiter;
      //     }
      //     await System.writeFile(
      //       cronFile,
      //       [
      //         '@reboot docker start bcms-shim',
      //         '0 0 * * * docker start bcms-shim',
      //       ].join('\n'),
      //     );
      //   },
      // },
    ]);
    await mainTasks.run();
  }
}
