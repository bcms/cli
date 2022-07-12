import { Node } from './node';

export class OrderedList extends Node {
  matching(): boolean {
    return this.DOMNode.nodeName === 'OL';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data(): any {
    return {
      type: 'ordered_list',
      attrs: {
        order: 1,
      },
    };
  }
}
