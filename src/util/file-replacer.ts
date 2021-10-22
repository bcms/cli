import { System } from '.';

export async function fileReplacer(config: {
  dirPath: string;
  basePath: string;
  endsWith?: string[];
  regex: RegExp[];
}): Promise<void> {
  const filePaths = await System.fileTree(config.dirPath, '');
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    if (
      config.endsWith &&
      !!config.endsWith.find((e) => filePath.abs.endsWith(e))
    ) {
      let replacer = config.basePath;
      if (filePath.rel !== '') {
        const depth = filePath.rel.split('/').length;
        replacer = new Array(depth).fill('..').join('/') + '/' + config.basePath;
      }
      const file = await System.readFile(filePath.abs);
      let fileFixed = file + '';
      for (let j = 0; j < config.regex.length; j++) {
        const regex = config.regex[j];
        fileFixed = fileFixed.replace(regex, replacer);
      }
      if (file !== fileFixed) {
        await System.writeFile(filePath.abs, fileFixed);
      }
    }
  }
}
