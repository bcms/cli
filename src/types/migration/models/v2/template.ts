import type { PropV2 } from './prop';
import type { EntityV2 } from './_entity';

export interface TemplateV2 extends EntityV2 {
  name: string;
  label: string;
  desc: string;
  userId: string;
  singleEntry: boolean;
  props: PropV2[];
}
