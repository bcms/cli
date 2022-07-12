/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node } from './node';

export class CodeBlock extends Node {
  matching(): boolean {
    return (
      this.DOMNode.nodeName === 'CODE' &&
      this.DOMNode.parentNode.nodeName === 'PRE'
    );
  }

  getLanguage(): string {
    const language = this.DOMNode.getAttribute('class');
    return language ? language.replace(/^language-/, '') : language;
  }

  data(): any {
    const language = this.getLanguage();

    if (language) {
      return {
        type: 'code_block',
        attrs: {
          language,
        },
      };
    }

    return {
      type: 'code_block',
    };
  }
}
