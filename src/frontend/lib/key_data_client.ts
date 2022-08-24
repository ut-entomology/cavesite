/**
 * Library for generically accessing key data.
 */

import type { AxiosInstance } from 'axios';

export async function loadKeyData(
  client: AxiosInstance,
  mine: boolean,
  key: string
): Promise<string | null> {
  return (await client.post('api/key_data/pull', { mine, key })).data.value;
}

export async function saveKeyData(
  client: AxiosInstance,
  mine: boolean,
  key: string,
  data: string
) {
  await client.post('api/key_data/save', { mine, key, data });
}
