/* eslint-disable @typescript-eslint/no-explicit-any */
import { Mark } from './mark';

export class Bold extends Mark {
  matching(): boolean {
    return this.DOMNode.nodeName === 'STRONG';
  }

  data(): any {
    return {
      type: 'bold',
    };
  }
}
