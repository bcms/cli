import type { EntityV3 } from './_entity';

export interface TagV3 extends EntityV3 {
  /** Unique */
  value: string;
  cid: string;
}
