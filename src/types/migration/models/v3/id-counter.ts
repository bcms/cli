import type { EntityV3 } from './_entity';

export interface IdCounterV3 extends EntityV3 {
  name: string;
  forId: string;
  count: number;
}
