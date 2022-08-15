/**
 * Library for generically accessing key data.
 */

import type { AxiosInstance } from 'axios';

export async function loadKeyData(client: AxiosInstance, mine: boolean, key: string) {
  return (await client.post('api/key_data/pull', { mine, key })).data.value;
}
