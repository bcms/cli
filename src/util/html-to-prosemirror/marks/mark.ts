/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
export class Mark {
  type: string;
  DOMNode: any;

  constructor(public DomNode: any) {
    this.type = 'mark';
  }

  matching(): boolean {
    return false;
  }

  data(): any[] {
    return [];
  }
}
