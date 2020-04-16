import * as util from 'util';
import * as ncp from 'ncp';
import * as execa from 'execa';

export class GeneralUtil {
  public static async copyFiles(from: string, to: string) {
    return util.promisify(ncp)(from, to, {
      clobber: false,
    });
  }

  public static async initGit(projectRoot: string): Promise<void> {
    const result = await execa('git', ['init'], {
      cwd: projectRoot,
    });
    if (result.failed) {
      throw new Error('Failed to initialize Git.');
    }
    return;
  }
}
