import type { FS } from '@banez/fs/types';

export interface Config {
  cloud: {
    origin: string;
  };
  fsDir: string;
  server: {
    linux: {
      homeBase: string;
      homeFs: FS;
    };
  };
}
