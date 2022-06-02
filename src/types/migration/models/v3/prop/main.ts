import type { PropV3RichTextData, PropV3ValueRichTextData } from './rich-text';
import type { PropV3ColorPickerData } from './color-picker';
import type { PropV3DateData } from './date';
import type {
  PropV3EntryPointerData,
  PropV3ValueEntryPointer,
} from './entry-pointer';
import type { PropV3EnumData } from './enum';
import type {
  PropV3GroupPointerData,
  PropV3ValueGroupPointerData,
} from './group-pointer';
import type { PropV3MediaData, PropV3ValueMediaData } from './media';
import type { PropV3ValueWidgetData, PropV3WidgetData } from './widget';

// eslint-disable-next-line no-shadow
export enum PropV3Type {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',

  DATE = 'DATE',
  ENUMERATION = 'ENUMERATION',
  MEDIA = 'MEDIA',

  GROUP_POINTER = 'GROUP_POINTER',
  ENTRY_POINTER = 'ENTRY_POINTER',
  WIDGET = 'WIDGET',

  COLOR_PICKER = 'COLOR_PICKER',
  RICH_TEXT = 'RICH_TEXT',
  TAG = 'TAG',
}

export type PropV3Data =
  | string[]
  | boolean[]
  | number[]
  | PropV3DateData
  | PropV3EnumData
  | PropV3EntryPointerData[]
  | PropV3GroupPointerData
  | PropV3MediaData[]
  | PropV3WidgetData
  | PropV3RichTextData[]
  | PropV3ColorPickerData;
export interface PropV3 {
  id: string;
  type: PropV3Type;
  required: boolean;
  name: string;
  label: string;
  array: boolean;
  defaultData: PropV3Data;
}

export interface PropV3Value {
  /**
   * This property value is the same as in BCMSProp.
   * Using it, prop can be connected with metadata.
   */
  id: string;
  data: PropV3ValueData;
}

export type PropV3ValueData =
  | string[]
  | boolean[]
  | number[]
  | PropV3DateData
  | PropV3ValueGroupPointerData
  | PropV3ValueMediaData[]
  | PropV3ValueWidgetData
  | PropV3ValueRichTextData[]
  | PropV3ValueEntryPointer[];
