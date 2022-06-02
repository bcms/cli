import type { PropV3 } from './prop';
import type { EntityV3 } from './_entity';

export interface WidgetV3 extends EntityV3 {
  cid: string;
  name: string;
  label: string;
  desc: string;
  previewImage: string;
  previewScript: string;
  previewStyle: string;
  props: PropV3[];
}
