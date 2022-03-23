import { createBcmsSdk } from '@becomes/cms-sdk';
import type { BCMSEntity, BCMSSdk } from '@becomes/cms-sdk/types';

export function createSdk3(config: { origin: string }): BCMSSdk {
  const cache: {
    [name: string]: BCMSEntity[];
  } = {};
  return createBcmsSdk({
    origin: config.origin,
    cache: {
      custom: {
        getters: {
          find(data) {
            if (!cache[data.name]) {
              return [];
            }
            const output: BCMSEntity[] = [];
            for (let i = 0; i < cache[data.name].length; i++) {
              const item = cache[data.name][i];
              if (data.query(item as never)) {
                output.push(item);
              }
            }
            return JSON.parse(JSON.stringify(output));
          },
          findOne(data) {
            if (!cache[data.name]) {
              return null;
            }
            for (let i = 0; i < cache[data.name].length; i++) {
              const item = cache[data.name][i];
              if (data.query(item as never)) {
                return JSON.parse(JSON.stringify(item));
              }
            }
          },
          items(data) {
            if (cache[data.name]) {
              return JSON.parse(JSON.stringify(cache[data.name]));
            }
            return [];
          },
        },
        mutations: {
          set(data) {
            if (!cache[data.name]) {
              cache[data.name] =
                data.payload instanceof Array
                  ? (data.payload as BCMSEntity[])
                  : [data.payload];
            } else {
              const input =
                data.payload instanceof Array ? data.payload : [data.payload];
              for (let i = 0; i < input.length; i++) {
                const inputItem = input[i];
                let found = false;
                for (let j = 0; j < cache[data.name].length; j++) {
                  const cacheItem = cache[data.name][j];
                  if (cacheItem._id === inputItem._id) {
                    cache[data.name][j] = inputItem;
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  cache[data.name].push(inputItem);
                }
              }
            }
          },
          remove(data) {
            if (cache[data.name]) {
              const input =
                data.payload instanceof Array ? data.payload : [data.payload];
              for (let i = 0; i < input.length; i++) {
                const inputItem = input[i];
                for (let j = 0; j < cache[data.name].length; j++) {
                  const cacheItem = cache[data.name][j];
                  if (cacheItem._id === inputItem._id) {
                    cache[data.name].splice(j, 1);
                    break;
                  }
                }
              }
            }
          },
        },
      },
    },
  });
}
