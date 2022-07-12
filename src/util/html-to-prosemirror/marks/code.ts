/* eslint-disable @typescript-eslint/no-explicit-any */
import { Mark } from './mark';

export class Code extends Mark {
  matching(): boolean {
    if (this.DOMNode.parentNode.nodeName === 'PRE') {
      return false;
    }

    return this.DOMNode.nodeName === 'CODE';
  }

  data(): any {
    return {
      type: 'code',
    };
  }
}
