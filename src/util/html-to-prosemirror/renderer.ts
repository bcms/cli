/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { minify } from 'html-minifier';
import { JSDOM } from 'jsdom';
import { Bold, Code, Italic, Link, Mark } from './marks';
import {
  BulletList,
  CodeBlock,
  CodeBlockWrapper,
  HardBreak,
  Heading,
  Image,
  ListItem,
  OrderedList,
  Paragraph,
} from './Nodes';

export class ProseMirrorRenderer {
  document: JSDOM = undefined as never;
  storedMarks: Mark[] = [];
  nodes = [
    BulletList,
    CodeBlock,
    CodeBlockWrapper,
    HardBreak,
    Heading,
    Image,
    ListItem,
    OrderedList,
    Paragraph,
    Text,
  ];
  marks = [Bold, Code, Italic, Link];

  setDocument(value: string): void {
    this.document = new JSDOM(this.stripWhitespace(value));
  }

  stripWhitespace(value: string): string {
    return minify(value, {
      collapseWhitespace: true,
    });
  }

  getDocumentBody(): HTMLBodyElement {
    return this.document.window.document.querySelector(
      'body',
    ) as HTMLBodyElement;
  }

  render(value: string): any {
    this.setDocument(value);

    const content = this.renderChildren(this.getDocumentBody());

    return {
      type: 'doc',
      content,
    };
  }

  renderChildren(node: HTMLElement | ChildNode): HTMLElement[] {
    const nodes: HTMLElement[] = [];

    node.childNodes.forEach((child) => {
      const NodeClass = this.getMatchingNode(child);

      if (NodeClass) {
        let item = NodeClass.data();

        if (!item) {
          if (child.hasChildNodes()) {
            nodes.push(...this.renderChildren(child));
          }
          return;
        }

        if (child.hasChildNodes()) {
          item = {
            ...item,
            content: this.renderChildren(child),
          };
        }

        if (this.storedMarks.length) {
          item = {
            ...item,
            marks: this.storedMarks,
          };
          this.storedMarks = [];
        }

        if (NodeClass.wrapper) {
          item.content = [
            {
              ...NodeClass.wrapper,
              content: item.content || [],
            },
          ];
        }

        nodes.push(item);
      }

      const MarkClass = this.getMatchingMark(child);

      if (MarkClass) {
        this.storedMarks.push(MarkClass.data());

        if (child.hasChildNodes()) {
          nodes.push(...this.renderChildren(child));
        }
      }
    });

    return nodes;
  }

  getMatchingNode(item: any): any {
    return this.getMatchingClass(item, this.nodes);
  }

  getMatchingMark(item: any): any {
    return this.getMatchingClass(item, this.marks);
  }

  getMatchingClass(node: HTMLElement, classes: any[]): any {
    for (const i in classes) {
      const Class = classes[i];
      const instance = new Class(node);
      if (instance.matching()) {
        return instance;
      }
    }

    return false;
  }

  addNode(node: any): void {
    this.nodes.push(node);
  }

  addNodes(nodes: any[]): void {
    for (const i in nodes) {
      this.addNode(nodes[i]);
    }
  }

  addMark(mark: any): void {
    this.marks.push(mark);
  }

  addMarks(marks: any[]): void {
    for (const i in marks) {
      this.addMark(marks[i]);
    }
  }
}
