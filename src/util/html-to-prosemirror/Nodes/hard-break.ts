/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node } from './node';

export class HardBreak extends Node {
  matching(): boolean {
    return this.DOMNode.nodeName === 'BR';
  }

  data(): any {
    return {
      type: 'hard_break',
    };
  }
}
