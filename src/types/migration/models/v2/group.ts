import type { PropV2 } from './prop';
import type { EntityV2 } from './_entity';

export interface GroupV2 extends EntityV2 {
  name: string;
  label: string;
  desc: string;
  props: PropV2[];
}
