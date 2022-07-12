import { Mark } from './mark';

export class Link extends Mark {
  matching(): boolean {
    return this.DOMNode.nodeName === 'A';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data(): any {
    return {
      type: 'link',
      attrs: {
        href: this.DOMNode.getAttribute('href'),
      },
    };
  }
}
