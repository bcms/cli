import { ChildProcess } from '@banez/child_process';
import { createTasks } from '@banez/npm-tool';
import { prompt } from 'inquirer';
import type { Args } from '../types';

export class DockerUtil {
  static async setup({ args }: { args: Args }): Promise<boolean> {
    const rexo = {
      out: '',
      err: '',
    };
    await ChildProcess.advancedExec('docker --version', {
      onChunk: ChildProcess.onChunkHelper(rexo),
      doNotThrowError: true,
    }).awaiter;
    if (rexo.err) {
      if (rexo.err.indexOf('not found')) {
        const installDockerResult =
          args.instance === 'machine-install'
            ? { yes: true }
            : await prompt<{ yes: boolean }>([
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
          return false;
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
                const cont =
                  args.instance === 'machine-install'
                    ? { yes: false }
                    : await prompt<{ yes: boolean }>([
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
    return true;
  }
}
