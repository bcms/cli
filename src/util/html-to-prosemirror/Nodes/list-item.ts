/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node } from './node';

export class ListItem extends Node {
  constructor(DOMNode: any) {
    super(DOMNode);
    this.wrapper = {
      type: 'paragraph',
    };
  }

  matching(): boolean {
    return this.DOMNode.nodeName === 'LI';
  }

  data(): any {
    if (
      this.DOMNode.childNodes.length === 1 &&
      this.DOMNode.childNodes[0].nodeName === 'P'
    ) {
      this.wrapper = null;
    }

    return {
      type: 'list_item',
    };
  }
}
