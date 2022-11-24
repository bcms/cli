import type { ApiClient } from '@becomes/cms-cloud-client/types';
import type { Args } from './types';

export async function logout({
  client,
}: {
  args: Args;
  client: ApiClient;
}): Promise<void> {
  try {
    await client.auth.logout();
  } catch (error) {
    console.warn(error);
  }
  await client.storage.remove('at');
  await client.storage.remove('rt');
}
