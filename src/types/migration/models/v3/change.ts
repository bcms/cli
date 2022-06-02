import type { EntityV3 } from './_entity';

export type ChangeV3Name =
  | 'entry'
  | 'group'
  | 'color'
  | 'language'
  | 'media'
  | 'status'
  | 'tag'
  | 'templates'
  | 'widget';

export interface ChangeV3 extends EntityV3 {
  name: ChangeV3Name;
  count: number;
}
