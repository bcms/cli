import type { ApiClient } from '@becomes/cms-cloud-client/types';
import { prompt } from 'inquirer';
import type { Args } from './util';

export async function login({
  client,
  args,
}: {
  args: Args;
  client: ApiClient;
}) {
  if (!args.email) {
    const result = await prompt<{ email: string }>([
      {
        type: 'input',
        name: 'email',
        message: 'Email: ',
      },
    ]);
    args.email = result.email;
  }
  if (!args.password) {
    const result = await prompt<{ password: string }>([
      {
        type: 'password',
        name: 'password',
        message: 'Password: ',
      },
    ]);
    args.password = result.password;
  }
  await client.auth.login(args.email, args.password);
  console.log('You are now logged in to the BCMS Cloud.')
}
