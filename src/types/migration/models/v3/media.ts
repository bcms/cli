import type { EntityV3 } from './_entity';

// eslint-disable-next-line no-shadow
export enum MediaV3Type {
  DIR = 'DIR',
  IMG = 'IMG',
  VID = 'VID',
  TXT = 'TXT',
  GIF = 'GIF',
  OTH = 'OTH',
  PDF = 'PDF',
  JS = 'JS',
  HTML = 'HTML',
  CSS = 'CSS',
  JAVA = 'JAVA',
}

export interface MediaV3 extends EntityV3 {
  userId: string;
  type: MediaV3Type;
  mimetype: string;
  size: number;
  name: string;
  isInRoot: boolean;
  hasChildren: boolean;
  parentId: string;
  altText: string;
  caption: string;
  width: number;
  height: number;
}
