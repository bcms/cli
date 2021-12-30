import type { PropV2 } from './prop';
import type { EntityV2 } from './_entity';

export interface WidgetV2 extends EntityV2 {
  name: string;
  label: string;
  desc: string;
  previewImage: string;
  previewScript: string;
  previewStyle: string;
  props: PropV2[];
}
