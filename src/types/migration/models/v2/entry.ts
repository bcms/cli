import type { PropV2 } from './prop';
import type { EntityV2 } from './_entity';

export interface EntryV2Meta {
  lng: string;
  props: PropV2[];
}

export interface EntryV2Content {
  lng: string;
  props: PropV2[];
}

export interface EntryV2 extends EntityV2 {
  templateId: string;
  userId: string;
  status?: string;
  meta: EntryV2Meta[];
  content: EntryV2Content[];
}
