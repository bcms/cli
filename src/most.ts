import { createBcmsMost } from '@becomes/cms-most';
import type { Args } from './types';

export class Most {
  static async resolve({ args }: { args: Args }): Promise<void> {
    const most = createBcmsMost();
    if (args.most === 'pull-content') {
      await most.content.pull();
    } else if (args.most === 'pull-media') {
      await most.media.pull();
    } else if (args.most === 'pull-types') {
      await most.typeConverter.pull();
    } else if (args.most === 'pull-templates') {
      await most.template.pull();
    } else if (args.most === 'all') {
      await most.template.pull();
      await most.content.pull();
      await most.media.pull();
      await most.typeConverter.pull();
    }
  }
}
