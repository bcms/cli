import type { EntityV2 } from './_entity';

// eslint-disable-next-line no-shadow
export enum MediaV2Type {
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

export interface MediaV2 extends EntityV2 {
  userId: string;
  type: MediaV2Type;
  mimetype: string;
  size: number;
  name: string;
  path: string;
  isInRoot: boolean;
  hasChildren: boolean;
  parentId: string;
}
