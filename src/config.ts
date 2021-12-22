import { createFS } from '@banez/fs';
import { homedir } from 'os';
import * as path from 'path';
import type { Config as ConfigType } from './types';

export const Config: ConfigType = {
  cloud: {
    origin: 'https://cloud.thebcms.com',
  },
  fsDir: path.join(homedir(), '.bcms'),
  server: {
    linux: {
      homeBase: '/var/lib/bcms',
      homeFs: createFS({
        base: '/var/lib/bcms',
      }),
    },
  },
};
