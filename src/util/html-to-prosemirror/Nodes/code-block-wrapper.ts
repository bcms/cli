/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node } from './node';

export class CodeBlockWrapper extends Node {
  matching(): boolean {
    return this.DOMNode.nodeName === 'PRE';
  }

  data(): any {
    return null;
  }
}
