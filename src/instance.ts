import * as path from 'path';
import * as fse from 'fs-extra';
import { Args, createTasks, System } from './util';
import { prompt } from 'inquirer';

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
}
