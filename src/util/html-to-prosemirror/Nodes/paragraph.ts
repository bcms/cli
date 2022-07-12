/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node } from './node';

export class Paragraph extends Node {
  matching(): boolean {
    return this.DOMNode.nodeName === 'P';
  }

  data(): any {
    return {
      type: 'paragraph',
    };
  }
}
