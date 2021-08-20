import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { SpawnOptions, spawn } from 'child_process';

export class System {
  static async spawn(
    cmd: string,
    args: string[],
    options?: SpawnOptions,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const proc = spawn(
        cmd,
        args,
        options
          ? options
          : {
              stdio: 'inherit',
            },
      );
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(code);
        } else {
          resolve();
        }
      });
    });
  }
  static async readFile(location: string): Promise<string> {
    return (await util.promisify(fs.readFile)(location)).toString();
  }
  static async writeFile(
    location: string,
    data: string | Buffer,
  ): Promise<void> {
    await util.promisify(fs.writeFile)(location, data);
  }
  static async fileTree(
    startingLocation: string,
    location: string,
  ): Promise<
    Array<{
      rel: string;
      abs: string;
    }>
  > {
    const output: Array<{
      rel: string;
      abs: string;
    }> = [];
    const basePath = path.join(startingLocation, location);
    const files = await util.promisify(fs.readdir)(basePath);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(basePath, file);
      const stat = await util.promisify(fs.lstat)(filePath);
      if (stat.isDirectory()) {
        const children = await this.fileTree(
          startingLocation,
          path.join(location, file),
        );
        for (let j = 0; j < children.length; j++) {
          const child = children[j];
          output.push(child);
        }
      } else {
        output.push({
          abs: filePath,
          rel: location,
        });
      }
    }
    return output;
  }
  static async exist(location: string, isFile?: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const pth = location.startsWith('/') ? location : location;
      fs.stat(pth, (err, stats) => {
        if (err) {
          if (err.code === 'ENOENT') {
            resolve(false);
            return;
          } else {
            reject(err);
          }
          return;
        }
        if (isFile) {
          resolve(stats.isFile());
        } else {
          resolve(stats.isDirectory());
        }
      });
    });
  }
}
