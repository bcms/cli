import * as open from 'open';
import type { ApiClient } from '@becomes/cms-cloud-client/types';
import type { Args } from './util';
import { EventManager } from './event';

export async function login({
  client,
  args,
}: {
  args: Args;
  client: ApiClient;
}) {
  if (await client.isLoggedIn()) {
    try {
      await client.auth.logout();
    } catch (error) {
      console.warn('Failed to logout previous user...');
    }
  }
  const url = `${args.cloudOrigin}/login?type=cb&d=${Buffer.from(
    JSON.stringify({ host: 'http://localhost:1278' }),
  ).toString('base64url')}`;
  await open(url);
  console.log(`Open URL in your browser to login to the BCMS Cloud: ${url}`);
  await new Promise<void>((resolve) => {
    const unsub = EventManager.subscribe('login', async () => {
      unsub();
      console.log('You are now logged in to the BCMS Cloud.');
      resolve();
    });
  });
}
