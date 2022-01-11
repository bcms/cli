import * as nodejsPath from 'path';
import { createFS } from '@banez/fs';
import * as sharp from 'sharp';
import { MediaV3, MediaV3Type } from '../types';
import { ChildProcess } from '@banez/child_process';
import { Migration } from '../migration';
import type { ChildProcessOnChunkHelperOutput } from '@banez/child_process/types';

export class MediaUtil {
  static get v3(): {
    getPath(data: { media: MediaV3; allMedia: MediaV3[] }): Promise<string>;
    createVideoThumbnail(data: {
      media: MediaV3;
      allMedia: MediaV3[];
    }): Promise<void>;
    createGifThumbnail(data: {
      media: MediaV3;
      allMedia: MediaV3[];
    }): Promise<void>;
    createImageThumbnail(data: {
      media: MediaV3;
      allMedia: MediaV3[];
    }): Promise<void>;
  } {
    const basePath = nodejsPath.join(Migration.basePath, 'v3_data', 'uploads');
    const outputFs = createFS({
      base: basePath,
    });
    return {
      async getPath({ media, allMedia }) {
        if (
          media.type !== MediaV3Type.DIR &&
          media.isInRoot &&
          !media.parentId
        ) {
          return `/${media.name}`;
        } else {
          const parent = allMedia.find((e) => e._id === media.parentId);
          if (!parent) {
            return `/${media.name}`;
          }
          return `${await MediaUtil.v3.getPath({ media: parent, allMedia })}/${
            media.name
          }`;
        }
      },
      async createVideoThumbnail({ media, allMedia }) {
        if (media.type !== MediaV3Type.VID) {
          return;
        }
        const nameParts = media.name.split('.');
        const name =
          nameParts.slice(0, nameParts.length - 1).join('.') + '.png';
        const pathParts = (
          await MediaUtil.v3.getPath({ media, allMedia })
        ).split('/');
        const path = nodejsPath.join(
          basePath,
          ...pathParts.slice(0, pathParts.length - 1),
        );
        const exo: ChildProcessOnChunkHelperOutput = {
          err: '',
          out: '',
        };
        if (await outputFs.exist(nodejsPath.join(path, `tmp-${name}`), true)) {
          await outputFs.deleteFile(nodejsPath.join(path, `tmp-${name}`));
        }
        await ChildProcess.advancedExec(
          [
            'ffmpeg',
            '-i',
            nodejsPath.join(path, media.name),
            '-ss',
            '00:00:01.000',
            '-vframes',
            '1',
            nodejsPath.join(path, `tmp-${name}`),
          ],
          {
            onChunk: ChildProcess.onChunkHelper(exo),
          },
        ).awaiter;
        if (
          exo.err &&
          (exo.err.includes('error') ||
            exo.err.includes('ERROR') ||
            exo.err.includes('Error'))
        ) {
          throw Error(exo.err);
        }
        await sharp(nodejsPath.join(path, `tmp-${name}`))
          .resize({
            width: 300,
            withoutEnlargement: true,
          })
          .png({
            quality: 50,
          })
          .toFile(nodejsPath.join(path, `thumbnail-${name}`));
        await outputFs.deleteFile(nodejsPath.join(path, `tmp-${name}`));
      },
      async createGifThumbnail({ media, allMedia }) {
        if (media.type !== MediaV3Type.GIF) {
          return;
        }
        const nameParts = media.name.split('.');
        const name =
          nameParts.slice(0, nameParts.length - 1).join('.') + '.png';
        const pathParts = (
          await MediaUtil.v3.getPath({ media, allMedia })
        ).split('/');
        const path = nodejsPath.join(
          basePath,
          ...pathParts.slice(0, pathParts.length - 1),
        );
        const exo: ChildProcessOnChunkHelperOutput = {
          err: '',
          out: '',
        };
        if (await outputFs.exist(nodejsPath.join(path, `tmp-${name}`), true)) {
          await outputFs.deleteFile(nodejsPath.join(path, `tmp-${name}`));
        }
        await ChildProcess.advancedExec([
          'ffmpeg',
          '-i',
          nodejsPath.join(path, media.name),
          '-ss',
          '00:00:01.000',
          '-vframes',
          '1',
          nodejsPath.join(path, `tmp-${name}`),
        ]).awaiter;
        if (
          exo.err &&
          (exo.err.includes('error') ||
            exo.err.includes('ERROR') ||
            exo.err.includes('Error'))
        ) {
          throw Error(exo.err);
        }
        await sharp(nodejsPath.join(path, `tmp-${name}`))
          .resize({
            width: 300,
            withoutEnlargement: true,
          })
          .png({
            quality: 50,
          })
          .toFile(nodejsPath.join(path, `thumbnail-${name}`));
        await outputFs.deleteFile(nodejsPath.join(path, `tmp-${name}`));
      },
      async createImageThumbnail({ media, allMedia }) {
        const pathToMedia = await MediaUtil.v3.getPath({ media, allMedia });
        const nameParts = {
          name: media.name.split('.')[0],
          ext: media.name.split('.')[1].toLowerCase(),
        };
        const mediaPathParts = pathToMedia.split('/');
        const pathOnly = mediaPathParts
          .slice(0, mediaPathParts.length - 1)
          .join('/');
        if (nameParts.ext === 'png') {
          const output = await sharp(nodejsPath.join(basePath, pathToMedia))
            .resize({
              width: 300,
              withoutEnlargement: true,
            })
            .png({
              quality: 50,
            })
            .toBuffer();
          await outputFs.save(
            nodejsPath.join(basePath, pathOnly, `300-${media.name}`),
            output,
          );
        } else if (nameParts.ext === 'jpg' || nameParts.ext === 'jpeg') {
          const output = await sharp(nodejsPath.join(basePath, pathToMedia))
            .resize({
              width: 300,
              withoutEnlargement: true,
            })
            .jpeg({
              quality: 50,
            })
            .toBuffer();
          await outputFs.save(
            nodejsPath.join(basePath, pathOnly, `300-${media.name}`),
            output,
          );
        }
      },
    };
  }
}
