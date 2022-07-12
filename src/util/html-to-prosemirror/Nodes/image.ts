/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node } from './node';

export class Image extends Node {
  matching(): boolean {
    return this.DOMNode.nodeName === 'IMG';
  }

  data(): any {
    return {
      type: 'image',
      attrs: {
        src: this.DOMNode.getAttribute('src'),
        class: this.DOMNode.getAttribute('class') || undefined,
        alt: this.DOMNode.getAttribute('alt') || undefined,
        title: this.DOMNode.getAttribute('title') || undefined,
      },
    };
  }
}
