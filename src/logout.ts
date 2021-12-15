import type { ApiClient } from '@becomes/cms-cloud-client/types';
import type { Args } from './util';

export async function logout({
  client,
}: {
  args: Args;
  client: ApiClient;
}): Promise<void> {
  await client.auth.logout();
}