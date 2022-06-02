import type { PropV3 } from './prop';
import type { EntityV3 } from './_entity';

export interface GroupV3 extends EntityV3 {
  cid: string;
  name: string;
  label: string;
  desc: string;
  props: PropV3[];
}
