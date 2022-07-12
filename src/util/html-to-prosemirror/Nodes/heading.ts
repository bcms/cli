/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node } from './node';

export class Heading extends Node {
  getLevel(): string {
    const matches = this.DOMNode.nodeName.match(/^H([1-6])/);
    return matches ? matches[1] : null;
  }

  matching(): boolean {
    return Boolean(this.getLevel());
  }

  data(): any {
    return {
      type: 'heading',
      attrs: {
        level: this.getLevel(),
      },
    };
  }
}
