/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node } from './node';

export class BulletList extends Node {
  matching(): boolean {
    return this.DOMNode.nodeName === 'UL';
  }

  data(): any {
    return {
      type: 'bullet_list',
    };
  }
}
