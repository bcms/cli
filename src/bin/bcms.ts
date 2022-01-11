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
import { MigrationConfig, MigrationConfigSchema } from '../types';
import { ObjectUtility } from '@banez/object-utility';
import { ObjectUtilityError } from '@banez/object-utility/types';
import { createTerminalTitle, Terminal } from '../terminal';

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
  const storageFilePath = path.join(Config.fsDir, 'cli.db.json');
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
    await fs.save(storageFilePath, '{}');
  }
  (storage as any).init(JSON.parse(await fs.readString(storageFilePath)));
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
  } else if (args.cms) {
    if (args.cms === 'bundle') {
      await CMS.bundle();
    } else if (args.cms === 'deploy') {
      await CMS.deploy({ args, client });
    } else if (args.cms === 'clone') {
      await CMS.clone({ args, client });
    }
  } else if (args.plugin) {
    if (args.bundle) {
      await Plugin.bundle(args);
    }
  } else if (args.function) {
    if (args.create) {
      await Function.create(args);
    }
  } else if (typeof args.instance === 'string') {
    if (args.install) {
      await Instance.install({ args, client });
    }
  } else if (args.migration) {
    let migrationConfig: MigrationConfig = {} as never;

    if (await rootFs.exist('bcms.migration.json', true)) {
      migrationConfig = JSON.parse(
        await rootFs.readString('bcms.migration.json'),
      );
      const result = ObjectUtility.compareWithSchema(
        migrationConfig,
        MigrationConfigSchema,
        'migrationConfig',
      );
      if (result instanceof ObjectUtilityError) {
        throw Error(result.message);
      }
    } else {
      migrationConfig = {
        database: {
          from: {
            collectionPrefix: args.collectionPrfx || 'bcms',
            url: args.dbUrl || '',
          },
          to: {
            collectionPrefix: args.toCollectionPrfx || 'bcms',
            url: args.toDBUrl || '',
          },
        },
      };
    }

    if (args.version === '2') {
      if (args.migration === 'pull') {
        Terminal.pushComponent({
          name: 'title',
          component: createTerminalTitle({
            state: {
              text: 'Migration V2 - Pull',
            },
          }),
        });
        Terminal.render();
        await Migration.pull.v2({ args, migrationConfig });
      } else if (args.migration === 'transform') {
        Terminal.pushComponent({
          name: 'title',
          component: createTerminalTitle({
            state: {
              text: 'Migration V2 - Transform V2 to V3 database',
            },
          }),
        });
        Terminal.render();
        await Migration.transform.v2({ args, migrationConfig });
      }
    } else if (args.version === '3') {
      if (args.migration === 'push-fsdb') {
        await Migration.push.v3FSDB({ args, migrationConfig });
      }
    }
  }
  setTimeout(() => {
    process.exit(0);
  }, 200);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
