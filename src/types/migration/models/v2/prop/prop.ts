import type { PropV2Enum } from './enum';
import type { PropV2GroupPointer } from './group-pointer';
import type { PropV2EntryPointer } from './entry-pointer';
import type { PropV2Media } from './media';
import type { PropV2Quill, PropV2Widget } from './quill';

// eslint-disable-next-line no-shadow
export enum PropV2Type {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',

  DATE = 'DATE',
  ENUMERATION = 'ENUMERATION',
  MEDIA = 'MEDIA',

  GROUP_POINTER = 'GROUP_POINTER',
  ENTRY_POINTER = 'ENTRY_POINTER',

  HEADING_1 = 'HEADING_1',
  HEADING_2 = 'HEADING_2',
  HEADING_3 = 'HEADING_3',
  HEADING_4 = 'HEADING_4',
  HEADING_5 = 'HEADING_5',

  PARAGRAPH = 'PARAGRAPH',

  LIST = 'LIST',
  EMBED = 'EMBED',
  CODE = 'CODE',
  WIDGET = 'WIDGET',

  RICH_TEXT = 'RICH_TEXT',
}

export type PropV2Value =
  | string[]
  | boolean[]
  | number[]
  | PropV2Enum
  | PropV2GroupPointer
  | PropV2EntryPointer
  | PropV2Media[]
  | PropV2Quill
  | PropV2Widget;

export interface PropV2 {
  type: PropV2Type;
  required: boolean;
  name: string;
  label: string;
  array: boolean;
  value: PropV2Value;
}
