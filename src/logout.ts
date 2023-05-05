import type { BCMSCloudSdk } from '@becomes/cms-cloud-client';
import type { Args } from './types';

export async function logout({
  client,
}: {
  args: Args;
  client: BCMSCloudSdk;
}): Promise<void> {
  try {
    await client.auth.logout();
  } catch (error) {
    console.warn(error);
  }
  await client.storage.remove('at');
  await client.storage.remove('rt');
}
