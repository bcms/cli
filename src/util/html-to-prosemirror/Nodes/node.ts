/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export class Node {
  wrapper: any;
  type: string;

  constructor(public DOMNode: any) {
    this.wrapper = null;
    this.type = 'node';
  }

  matching(): boolean {
    return false;
  }

  data(): any[] {
    return [];
  }
}
