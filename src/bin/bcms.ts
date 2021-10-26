#!/usr/bin/env node

import { mkdir } from 'fs/promises';
import { homedir } from 'os';
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
import { parseArgs, System } from '../util';
import { login } from '../login';
import { logout } from '../logout';

async function main() {
  const args = parseArgs(process.argv);
  const storageFilePath = path.join(homedir(), '.bcms', 'cli.db.json');
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
      await System.writeFile(
        storageFilePath,
        JSON.stringify(store, null, '  '),
      );
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
  if (!(await System.exist(path.join(homedir(), '.bcms')))) {
    await mkdir(path.join(homedir(), '.bcms'));
  }
  if (!(await System.exist(storageFilePath, true))) {
    await System.writeFile(storageFilePath, '{}');
  }
  (storage as any).init(JSON.parse(await System.readFile(storageFilePath)));
  const client = createCloudApiClient({
    args,
    storage,
  });
  if (args.login) {
    await login({ client, args });
  } else if (args.logout) {
    await logout({ args, client });
  } else if (args.cms) {
    if (args.bundle) {
      await CMS.bundle();
    } else if (typeof args.deploy === 'string') {
      await CMS.deploy({ args, client });
    }
  } else if (args.plugin) {
    if (args.bundle) {
      await Plugin.bundle(args);
    }
  } else if (args.function) {
    if (args.create) {
      await Function.create(args);
    }
  } else if (args.instance) {
    if (args.run) {
      await Instance.run(args);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
