/* eslint-disable @typescript-eslint/no-explicit-any */
import { Mark } from './mark';

export class Italic extends Mark {
  matching(): boolean {
    return this.DOMNode.nodeName === 'EM';
  }

  data(): any {
    return {
      type: 'italic',
    };
  }
}
