import { Docker } from '@banez/docker';
import type { DockerContainerInfo } from '@banez/docker/types';
import { DockerUtil } from './util';
import { createTasks } from '@banez/npm-tool';
import { ChildProcess } from '@banez/child_process';
import type { ChildProcessOnChunkHelperOutput } from '@banez/child_process/types';
import { Config } from './config';
import type { Args } from './types';
import { StringUtility } from '@banez/string-utility';
import type { BCMSCloudSdk } from '@becomes/cms-cloud-client';

export class Shim {
  static readonly containerName = 'bcms-shim';

  static async resolve({
    args,
    client,
  }: {
    args: Args;
    client: BCMSCloudSdk;
  }): Promise<void> {
    if (args.shim === 'install') {
      await this.install({ args, client });
    } else if (args.shim === 'update') {
      await this.update({ args, client });
    }
  }
  static async install({
    args,
    client,
  }: {
    args: Args;
    client: BCMSCloudSdk;
  }): Promise<void> {
    let dockerImageVersion = 'latest';
    if (args.instanceId) {
      dockerImageVersion = await client.shim.version({
        instanceId: args.instanceId || '____none',
      });
    }

    if (!(await DockerUtil.setup({ args }))) {
      return;
    }

    /**
     * Check if shim is already installed
     */
    let info: DockerContainerInfo | undefined;
    try {
      info = await Docker.container.info(this.containerName);
    } catch (error) {
      info = undefined;
    }
    if (info && info.State && info.State.Running) {
      return;
    }
    await createTasks([
      {
        title: 'Prepare BCMS directory.',
        async task() {
          if (!(await Config.server.linux.homeFs.exist('storage'))) {
            await Config.server.linux.homeFs.mkdir('storage');
          }
          if (!(await Config.server.linux.homeFs.exist('licenses'))) {
            await Config.server.linux.homeFs.mkdir('licenses');
          }
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
            }
          ).awaiter;
          if (exo.err) {
            if (!exo.err.includes('network with name bcms already exists')) {
              throw Error(
                [
                  '[e1] Cannot create "bcms" docker network.',
                  'You will need to create it manually. ---',
                  exo.err,
                ].join(' ')
              );
            }
          } else if (!exo.out) {
            throw Error(
              [
                '[e2] Cannot create "bcms" docker network.',
                'You will need to create it manually.',
              ].join(' ')
            );
          }
        },
      },
      {
        title: 'Pull Docker BCMS Shim image',
        async task() {
          await ChildProcess.spawn('docker', [
            'pull',
            `becomes/cms-shim:${dockerImageVersion}`,
          ]);
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
              'cd /var/lib',
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
              `${Config.server.linux.homeBase}/storage:/app/storage`,
              '-v',
              `${Config.server.linux.homeBase}/licenses:/app/licenses`,
              '-e',
              'PORT=1279',
              '-e',
              `BCMS_CLOUD_DOMAIN=${
                args.cloudOrigin
                  ? args.cloudOrigin
                      .replace('https://', '')
                      .replace('http://', '')
                  : 'cloud.thebcms.com'
              }`,
              '-e',
              `BCMS_CLOUD_PORT=${
                args.cloudOrigin
                  ? args.cloudOrigin.startsWith('https')
                    ? '443'
                    : '80'
                  : '443'
              }`,
              '-e',
              'BCMS_MANAGE=true',
              '--name',
              'bcms-shim',
              '--hostname',
              'bcms-shim',
              `becomes/cms-shim:${dockerImageVersion}`,
              '&&',
              'ls -l',
            ].join(' '),
            {
              onChunk(type, chunk) {
                process[type].write(chunk);
              },
            }
          ).awaiter;
        },
      },
      {
        title: 'Create cronjobs',
        async task() {
          const cronFile = '/var/spool/cron/crontabs/root';
          let fileContent = '';
          if (!(await Config.server.linux.homeFs.exist(cronFile, true))) {
            await ChildProcess.advancedExec([
              'touch',
              cronFile,
              '&&',
              `chmod 600 ${cronFile}`,
            ]).awaiter;
          } else {
            fileContent = await Config.server.linux.homeFs.readString(cronFile);
          }
          const shimPart = StringUtility.textBetween(
            fileContent,
            '# ---- SHIM START ----\n',
            '\n# ---- SHIM END ----'
          );
          if (shimPart) {
            fileContent = fileContent.replace(
              shimPart,
              [
                '@reboot sudo docker start bcms-shim',
                '* * * * * sudo docker start bcms-shim',
                '* * * * * sudo bcms --shim update',
              ].join('\n')
            );
          } else {
            fileContent += [
              '# ---- SHIM START ----',
              '@reboot sudo docker start bcms-shim',
              '* * * * * sudo docker start bcms-shim',
              '* * * * * sudo bcms --shim update',
              '# ---- SHIM END ----\n',
            ].join('\n');
          }
          await Config.server.linux.homeFs.save(cronFile, fileContent);
        },
      },
    ]).run();
  }
  static async update({
    client,
    args,
  }: {
    args: Args;
    client: BCMSCloudSdk;
  }): Promise<void> {
    console.log('Check shim updates ...');
    const newShimVersion = await client.shim.version({
      instanceId: args.instanceId || '____none',
    });
    const containersInfo = await Docker.container.list();
    const shimContainer = containersInfo.find((e) => e.names === 'bcms-shim');
    if (!shimContainer) {
      return;
    }
    console.log(
      'Curr:',
      shimContainer.image,
      'New:',
      `becomes/cms-shim:${newShimVersion}`
    );
    if (shimContainer.image !== `becomes/cms-shim:${newShimVersion}`) {
      console.log('Updating Shim');
      await Docker.image.pull(`becomes/cms-shim:${newShimVersion}`);
      await Docker.container.stop('bcms-shim');
      await Docker.container.remove('bcms-shim');
      await ChildProcess.advancedExec(
        [
          'cd /var/lib',
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
          `${Config.server.linux.homeBase}/storage:/app/storage`,
          '-v',
          `${Config.server.linux.homeBase}/licenses:/app/licenses`,
          '-e',
          'PORT=1279',
          '-e',
          `BCMS_CLOUD_DOMAIN=${
            args.cloudOrigin
              ? args.cloudOrigin.replace('https://', '').replace('http://', '')
              : 'cloud.thebcms.com'
          }`,
          '-e',
          `BCMS_CLOUD_PORT=${
            args.cloudOrigin
              ? args.cloudOrigin.startsWith('https')
                ? '443'
                : '80'
              : '443'
          }`,
          '-e',
          'BCMS_MANAGE=true',
          '--name',
          'bcms-shim',
          '--hostname',
          'bcms-shim',
          `becomes/cms-shim:${newShimVersion}`,
          '&&',
          'ls -l',
        ].join(' '),
        {
          onChunk(type, chunk) {
            process[type].write(chunk);
          },
        }
      ).awaiter;
    }
  }
}
