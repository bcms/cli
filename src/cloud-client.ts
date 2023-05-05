import * as crypto from 'crypto';
import * as path from 'path';
import { useThrowable } from './util';
import type { Args } from './types';
import { BCMSCloudSdk } from '@becomes/cms-cloud-client/sdk/main';
import type {
  Storage,
  StorageSubscriptionHandler,
} from '@banez/browser-storage/types';
import type { ArrayStore, StoreMethods } from '@banez/vue-array-store/types';
import type { UserProtected } from '@becomes/cms-cloud-client';
import { createFS } from '@banez/fs';
import { Config } from './config';

function createArrayStore<ItemType, Methods = unknown>(
  idKey: keyof ItemType,
  initItems?: ItemType[],
  methods?: StoreMethods<ItemType, Methods>,
): ArrayStore<ItemType, Methods> {
  const store = initItems || [];
  const self: ArrayStore<ItemType, Methods> = {
    items() {
      return store as ItemType[];
    },
    find(query) {
      for (let i = 0; i < store.length; i++) {
        const item = store[i];
        if (query(item as ItemType)) {
          return item as ItemType;
        }
      }
      return null;
    },
    findById(id) {
      const output = store.find((e) => e[idKey as never] === id);
      return (output as ItemType) || null;
    },
    findMany(query) {
      const output: ItemType[] = [];
      for (let i = 0; i < store.length; i++) {
        const item = store[i];
        if (query(item as ItemType)) {
          output.push(store[i] as ItemType);
        }
      }
      return output;
    },
    findManyById(ids) {
      return store.filter((e) => ids.includes(e[idKey as never])) as ItemType[];
    },
    set(inputItems) {
      const items = inputItems instanceof Array ? inputItems : [inputItems];
      for (let i = 0; i < items.length; i++) {
        const inputItem = items[i];
        let found = false;
        for (let j = 0; j < store.length; j++) {
          const storeItem = store[j];
          if (storeItem[idKey] === inputItem[idKey]) {
            found = true;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            store.splice(j, 1, inputItem as any);
            break;
          }
        }
        if (!found) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          store.push(inputItem as any);
        }
      }
    },
    remove(inputIds) {
      const ids = inputIds instanceof Array ? inputIds : [inputIds];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        for (let j = 0; j < store.length; j++) {
          const item = store[j];
          if (item[idKey as never] === id) {
            store.splice(j, 1);
          }
        }
      }
    },
    methods: {} as never,
  };
  if (methods) {
    self.methods = methods(self);
  }
  return self;
}

export async function createStorage(): Promise<Storage> {
  const fs = createFS({
    base: path.join(Config.fsDir, 'cli-db.json'),
  });
  let _storage: {
    [key: string]: string;
  } = {};
  if (await fs.exist('', true)) {
    _storage = JSON.parse(await fs.readString(''));
  }

  const ls = {
    async all() {
      return JSON.parse(JSON.stringify(_storage));
    },
    getItem(key: string) {
      return _storage[key];
    },
    async setItem(key: string, value: string) {
      _storage[key] = value;
      await fs.save('', JSON.stringify(_storage, null, '  '));
    },
    async removeItem(key: string) {
      delete _storage[key];
      await fs.save('', JSON.stringify(_storage, null, '  '));
    },
  };
  const subs: {
    [id: string]: {
      key: string;
      handler: StorageSubscriptionHandler<unknown>;
    };
  } = {};

  const self: Storage = {
    async clear() {
      _storage = {};
      await fs.save('', '{}');
    },
    async set(key, value) {
      const keyBase = `${key}`;
      try {
        let data = '';
        if (typeof value === 'object') {
          data = JSON.stringify(value);
        } else if (typeof value === 'string') {
          data = value as string;
        } else {
          // eslint-disable-next-line no-console
          console.error(
            `Value can be only "string" or "object" but "${typeof value}" was provided.`,
          );
          return false;
        }
        await ls.setItem(keyBase, data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        return false;
      }
      const ids = Object.keys(subs);
      for (let i = 0; i < ids.length; i++) {
        const sub = subs[ids[i]];
        if (sub.key === key) {
          await sub.handler(value, 'set');
        }
      }
      return true;
    },
    async remove(key) {
      await ls.removeItem(key);
      const ids = Object.keys(subs);
      for (let i = 0; i < ids.length; i++) {
        const sub = subs[ids[i]];
        if (sub.key === key) {
          await sub.handler(null, 'remove');
        }
      }
    },
    get(key) {
      const rawValue = ls.getItem(key);
      if (rawValue) {
        try {
          const data = JSON.parse(rawValue);
          return data;
        } catch (e) {
          return rawValue;
        }
      }
      return undefined;
    },
    subscribe(key, handler) {
      const id = crypto
        .createHash('sha1')
        .update(Date.now() + crypto.randomBytes(8).toString('hex'))
        .digest('hex');
      subs[id] = { key, handler: handler as never };
      return () => {
        delete subs[id];
      };
    },
  };
  return self;
}

export async function createCloudApiClient({
  args,
}: {
  args: Args;
}): Promise<BCMSCloudSdk> {
  const client: BCMSCloudSdk = new BCMSCloudSdk(
    args.cloudOrigin ? args.cloudOrigin : 'https://cloud.thebcms.com',
    await createStorage(),
    {
      user: createArrayStore<UserProtected, { me(): UserProtected | null }>(
        '_id',
        [],
        (userStore) => {
          return {
            me() {
              if (client.accessToken) {
                return userStore.findById(client.accessToken.payload.userId);
              }
              return null;
            },
          };
        },
      ),
      feature: createArrayStore('_id'),
      instance: createArrayStore('_id'),
      instanceDep: createArrayStore('_id'),
      instanceDomain: createArrayStore('_id'),
      instanceEnv: createArrayStore('_id'),
      instanceFje: createArrayStore('_id'),
      instancePlugin: createArrayStore('_id'),
      instanceProxyConfig: createArrayStore('_id'),
      instanceAdditionalFile: createArrayStore('_id'),
      invitation: createArrayStore('_id'),
      limit: createArrayStore('_id'),
      org: createArrayStore('_id'),
    },
    useThrowable(),
    {
      async push() {
        // Do nothing
      },
    },
  );
  return client;
}
