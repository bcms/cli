#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createStorage } from '@becomes/cms-cloud-client';
import type {
  Storage,
  StorageSubscriptionHandler,
} from '@becomes/cms-cloud-client/types';
import { createCloudApiClient } from '../cloud-client';
import { CMS } from '../cms';
import { Function } from '../function';
import { Instance } from '../instance';
import { Plugin } from '../plugin';
import { parseArgs } from '../util';
import { login } from '../login';
import { logout } from '../logout';
import {
  createBodyParserMiddleware,
  createCorsMiddleware,
  createPurpleCheetah,
  createRequestLoggerMiddleware,
} from '@becomes/purple-cheetah';
import type { PurpleCheetah } from '@becomes/purple-cheetah/types';
import { createServerController } from '../server';
import { Config } from '../config';
import { createFS } from '@banez/fs';
import { Migration } from '../migration';
import { Most } from '../most';
import { Shim } from '../shim';
import { help } from '../help';

async function main() {
  const fs = createFS({
    base: Config.fsDir,
  });
  const rootFs = createFS({
    base: process.cwd(),
  });
  const args = parseArgs(process.argv);
  if (!args.cloudOrigin) {
    args.cloudOrigin = 'https://cloud.thebcms.com';
  }
  const storageFilePath = path.join(Config.fsDir, 'cli-db.json');
  const storage = createStorage(() => {
    const store: {
      [key: string]: any;
    } = {};
    const subs: {
      [id: string]: {
        key: string;
        handler: StorageSubscriptionHandler<unknown>;
      };
    } = {};

    async function save() {
      await fs.save(storageFilePath, JSON.stringify(store, null, '  '));
    }
    async function triggerSubs(
      key: string,
      value: any,
      type: 'set' | 'remove',
    ) {
      const ids = Object.keys(subs);
      for (let i = 0; i < ids.length; i++) {
        const sub = subs[ids[i]];
        if (sub.key === key) {
          await sub.handler(value, type);
        }
      }
    }

    const self: Storage & {
      init(data: any): void;
    } = {
      init(data) {
        for (const key in data) {
          store[key] = data[key];
        }
      },
      async clear() {
        const keys = Object.keys(store);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          await self.remove(key);
        }
      },
      async set(key, value) {
        store[key] = value;
        await save();
        await triggerSubs(key, value, 'set');
        return true;
      },
      async remove(key) {
        let value: any;
        if (store[key]) {
          if (typeof store[key] === 'object') {
            value = JSON.parse(JSON.stringify(store[key]));
          } else {
            value = store[key];
          }
        }
        delete store[key];
        await save();
        triggerSubs(key, value, 'remove');
      },
      get(key) {
        return store[key];
      },
      subscribe(key, handler) {
        const id = uuidv4();
        subs[id] = { key, handler: handler as never };
        return () => {
          delete subs[id];
        };
      },
    };
    return self;
  });
  if (!(await fs.exist(Config.fsDir))) {
    await fs.mkdir(Config.fsDir);
  }
  if (!(await fs.exist(storageFilePath, true))) {
    console.log('HERE', {storageFilePath});
    await fs.save(storageFilePath, '{}');
  }
    console.log('HERE2', {storageFilePath});
  (storage as any).init(JSON.parse(await fs.readString(storageFilePath)));
    console.log('HERE3', {storageFilePath});
  const client = createCloudApiClient({
    args,
    storage,
  });
  await new Promise<PurpleCheetah>((resolve, reject) => {
    try {
      createPurpleCheetah({
        port: 1278,
        silentLogs: true,
        staticContentDir: path.join(__dirname, '..', 'public'),
        middleware: [
          createCorsMiddleware(),
          createBodyParserMiddleware(),
          createRequestLoggerMiddleware(),
        ],
        controllers: [createServerController({ client })],
        onReady(pc) {
          resolve(pc);
        },
      });
    } catch (error) {
      reject(error);
    }
  });
  if (args.login) {
    await login({ client, args });
  } else if (args.logout) {
    await logout({ args, client });
  } else if (typeof args.cms === 'string') {
    await CMS.resolve({ args, client });
  } else if (typeof args.plugin === 'string') {
    await Plugin.resolve({ args, client });
  } else if (typeof args.function === 'string') {
    await Function.resolve({ args, client });
  } else if (typeof args.instance === 'string') {
    await Instance.resolve({ args, client });
  } else if (typeof args.migration === 'string') {
    await Migration.resolve({ args, client, rootFs });
  } else if (args.most) {
    await Most.resolve({ args });
  } else if (typeof args.shim === 'string') {
    await Shim.resolve({ args, client });
  } else if (args.help) {
    await help();
  }
  setTimeout(() => {
    process.exit(0);
  }, 200);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
