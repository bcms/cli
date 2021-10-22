export class StringUtil {
  static textBetween(src: string, begin: string, end: string): string {
    const startIndex = src.indexOf(begin);
    if (startIndex === -1) {
      return '';
    }
    const endIndex = src.indexOf(end, startIndex + begin.length);
    if (endIndex === -1) {
      return '';
    }
    return src.substring(startIndex + begin.length, endIndex);
  }
  static allTextBetween(src: string, begin: string, end: string): string[] {
    const output: string[] = [];
    const index = {
      begin: src.indexOf(begin, 0),
      end: 0,
    };
    if (index.begin === -1) {
      return [];
    }
    index.end = src.indexOf(end, index.begin);
    if (index.end === -1) {
      return [];
    }
    output.push(src.substring(index.begin + begin.length, index.end));
    // eslint-disable-next-line no-constant-condition
    while (true) {
      index.begin = src.indexOf(begin, index.end);
      if (index.begin === -1) {
        break;
      }
      index.end = src.indexOf(end, index.begin);
      if (index.end === -1) {
        break;
      }
      output.push(src.substring(index.begin + begin.length, index.end));
    }
    return output;
  }
}
