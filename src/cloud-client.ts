import type { ApiClient, Storage } from '@becomes/cms-cloud-client/types';
import {
  createApiClient,
  createCache,
  useApiClient,
} from '@becomes/cms-cloud-client';
import { Args, useThrowable } from './util';

interface DefaultSetters<Item> {
  set(srcItems: Item[], items: Item | Item[]): void;
  remove(srcItems: Item[], items: Item | Item[]): void;
}
function defaultSetters<Item>(getId: (item: Item) => string): {
  set(srcItems: Item[], items: Item | Item[]): void;
  remove(srcItems: Item[], items: Item | Item[]): void;
} {
  return {
    set(srcItems, items): void {
      if (items instanceof Array) {
        for (let i = 0; i < items.length; i++) {
          let found = false;
          const itemId = getId(items[i]);
          for (let j = 0; j < srcItems.length; j++) {
            const srcItemId = getId(srcItems[j]);
            if (srcItemId === itemId) {
              found = true;
              srcItems[j] = items[i];
              break;
            }
          }
          if (!found) {
            srcItems.push(items[i]);
          }
        }
      } else {
        let found = false;
        const itemId = getId(items);
        for (let i = 0; i < srcItems.length; i++) {
          const srcItemId = getId(srcItems[i]);
          if (srcItemId === itemId) {
            found = true;
            srcItems[i] = items;
            break;
          }
        }
        if (!found) {
          srcItems.push(items);
        }
      }
    },
    remove(srcItems, items): void {
      if (items instanceof Array) {
        const removeIds = items.map((e) => getId(e));
        while (removeIds.length > 0) {
          const id = removeIds.pop();
          for (let i = 0; i < srcItems.length; i++) {
            const srcItemId = getId(srcItems[i]);
            if (srcItemId === id) {
              srcItems.splice(i, 1);
              break;
            }
          }
        }
      } else {
        const itemId = getId(items);
        for (let i = 0; i < srcItems.length; i++) {
          const srcItemId = getId(srcItems[i]);
          if (srcItemId === itemId) {
            srcItems.splice(i, 1);
            break;
          }
        }
      }
    },
  };
}

interface DefaultGetters<Item> {
  find(items: Item[], query: (item: Item) => boolean): Item[];
  findOne(items: Item[], query: (item: Item) => boolean): Item | undefined;
}
function defaultGetters<Item>(): {
  find(items: Item[], query: (item: Item) => boolean): Item[];
  findOne(items: Item[], query: (item: Item) => boolean): Item | undefined;
} {
  return {
    find(items, query) {
      const output: Item[] = [];
      for (let i = 0; i < items.length; i++) {
        if (query(items[i])) {
          output.push(items[i]);
        }
      }
      return output;
    },
    findOne(items, query) {
      for (let i = 0; i < items.length; i++) {
        if (query(items[i])) {
          return items[i];
        }
      }
    },
  };
}

export function createCloudApiClient({
  args,
  storage,
}: {
  args: Args;
  storage: Storage;
}): ApiClient {
  createApiClient({
    disableSocket: true,
    apiOrigin: args.cloudOrigin
      ? args.cloudOrigin + '/api/v1/gql'
      : 'https://cloud.thebcms.com/api/v1/gql',
    throwable: useThrowable(),
    storage,
    router: {
      async push() {
        // Do nothing...
      },
    },
    cache: createCache(() => {
      const cache: {
        [name: string]: {
          items: any[];
          setters: DefaultSetters<any>;
          getters: DefaultGetters<any>;
        };
      } = {
        user: {
          items: [],
          getters: defaultGetters(),
          setters: defaultSetters((item) => {
            return item._id;
          }),
        },
        org: {
          items: [],
          getters: defaultGetters(),
          setters: defaultSetters((item) => {
            return item._id;
          }),
        },
        instance: {
          items: [],
          getters: defaultGetters(),
          setters: defaultSetters((item) => {
            return item._id;
          }),
        },
        instanceLite: {
          items: [],
          getters: defaultGetters(),
          setters: defaultSetters((item) => {
            return item._id;
          }),
        },
        invitation: {
          items: [],
          getters: defaultGetters(),
          setters: defaultSetters((item) => {
            return item._id;
          }),
        },
      };
      return {
        find(name, query) {
          return JSON.parse(
            JSON.stringify(
              cache[name].getters.find(cache[name].items, query as never),
            ),
          );
        },
        findOne(name, query) {
          return JSON.parse(
            JSON.stringify(
              cache[name].getters.findOne(cache[name].items, query as never),
            ),
          );
        },
        items(name) {
          return JSON.parse(JSON.stringify(cache[name].items));
        },
        me() {
          const jwt = client.getAccessToken();
          if (jwt) {
            return cache.user.getters.findOne(
              cache.user.items,
              (e) => e._id === jwt.payload.userId,
            );
          }
        },
        set(name, items) {
          cache[name].setters.set(cache[name].items, items);
        },
        remove(name, items) {
          cache[name].setters.remove(cache[name].items, items);
        },
      };
    }),
  });
  const client = useApiClient();
  return client;
}
