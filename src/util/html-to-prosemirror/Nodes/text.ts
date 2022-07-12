import { Node } from './node';

/* eslint-disable @typescript-eslint/no-explicit-any */
export class Text extends Node {
  matching(): boolean {
    return this.DOMNode.nodeName === '#text';
  }

  data(): any {
    const text = this.DOMNode.nodeValue.replace(/^[\n]+/g, '');

    if (!text) {
      return null;
    }

    return {
      type: 'text',
      text,
    };
  }
}
