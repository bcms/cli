import type { EntityV3 } from './_entity';

export type ColorV3SourceType = 'group' | 'widget' | 'template';

export interface ColorV3Source {
  id: string;
  type: ColorV3SourceType;
}

export interface ColorV3 extends EntityV3 {
  cid: string;
  label: string;
  name: string;
  value: string;
  userId: string;
  source: ColorV3Source;
}
