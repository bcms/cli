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
  // if (!args.email) {
  //   const result = await prompt<{ email: string }>([
  //     {
  //       type: 'input',
  //       name: 'email',
  //       message: 'Email: ',
  //     },
  //   ]);
  //   args.email = result.email;
  // }
  // if (!args.password) {
  //   const result = await prompt<{ password: string }>([
  //     {
  //       type: 'password',
  //       name: 'password',
  //       message: 'Password: ',
  //     },
  //   ]);
  //   args.password = result.password;
  // }
  if (await client.isLoggedIn()) {
    try {
      await client.auth.logout();
    } catch (error) {
      console.warn('Failed to logout previous user...');
    }
  }
  await open(
    `${args.cloudOrigin}/login?type=cb&d=${Buffer.from(
      JSON.stringify({ host: 'http://localhost:1287' }),
    ).toString('base64url')}`,
  );
  const unsub = EventManager.subscribe('login', async () => {
    unsub();
    console.log('You are now logged in to the BCMS Cloud.');
    process.exit(0);
  });
  // await client.auth.loginOtp(args.email, args.password);
}
