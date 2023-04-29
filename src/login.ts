import * as open from 'open';
import { prompt } from 'inquirer';
import type { Args } from './types';
import { EventManager } from './event';
import type { BCMSCloudSdk } from '@becomes/cms-cloud-client';

export async function login({
  client,
  args,
}: {
  args: Args;
  client: BCMSCloudSdk;
}): Promise<void> {
  try {
    if (await client.isLoggedIn()) {
      try {
        await client.auth.logout();
      } catch (error) {
        console.warn('Failed to logout previous user...');
      }
    }
  } catch (error) {
    // Ignore error
  }
  if (args.otp) {
    await client.auth.loginOtp({ otp: args.otp, userId: args.userId || '' });
    console.log('You are now logged in to the BCMS Cloud.');
  } else if (args.terminalLogin) {
    const result = await prompt<{ email: string; password: string }>([
      {
        type: 'input',
        message: 'Email: ',
        name: 'email',
      },
      {
        type: 'password',
        message: 'Password: ',
        name: 'password',
      },
    ]);
    await client.auth.login({ email: result.email, password: result.password });
    console.log('You are now logged in to the BCMS Cloud.');
  } else {
    const url = `${args.cloudOrigin}/login?type=cb&d=${Buffer.from(
      JSON.stringify({ host: 'localhost:1278' }),
    ).toString('hex')}`;
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
}
