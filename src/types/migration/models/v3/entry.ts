import type { PropV3Value, PropV3ValueWidgetData } from './prop';
import type { EntityV3 } from './_entity';

export interface EntryV3Content {
  lng: string;
  nodes: EntryV3ContentNode[];
  plainText: string;
}

export interface EntryV3ContentNode {
  type: EntryV3ContentNodeType;
  content?: EntryV3ContentNode[];
  attrs?:
    | EntryV3ContentNodeHeadingAttr
    | PropV3ValueWidgetData
    | EntryV3ContentNodeLinkAttr
    | EntryV3ContentNodeCodeBlockAttr;
  marks?: EntryV3ContentNodeMarker[];
  text?: string;
}

export interface EntryV3ContentNodeCodeBlockAttr {
  language: string | null;
}

export interface EntryV3ContentNodeHeadingAttr {
  level: number;
}

export interface EntryV3ContentNodeLinkAttr {
  href: string;
  target: string;
}

export interface EntryV3ContentNodeMarker {
  type: EntryV3ContentNodeMarkerType;
  attrs?: EntryV3ContentNodeLinkAttr;
}

// eslint-disable-next-line no-shadow
export enum EntryV3ContentNodeType {
  paragraph = 'paragraph',
  heading = 'heading',
  widget = 'widget',
  bulletList = 'bulletList',
  listItem = 'listItem',
  orderedList = 'orderedList',
  text = 'text',
  codeBlock = 'codeBlock',
}

// eslint-disable-next-line no-shadow
export enum EntryV3ContentNodeMarkerType {
  bold = 'bold',
  italic = 'italic',
  underline = 'underline',
  strike = 'strike',
  link = 'link',
}

export interface EntryV3Meta {
  lng: string;
  props: PropV3Value[];
}

export interface EntryV3 extends EntityV3 {
  cid: string;
  templateId: string;
  userId: string;
  status?: string;
  meta: EntryV3Meta[];
  content: EntryV3Content[];
}
