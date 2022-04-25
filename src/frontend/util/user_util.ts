import type { AxiosInstance } from 'axios';

import { client } from '../stores/client';
import { userInfo } from '../stores/user_info';
import { setExpiration } from './refresher';

let clientValue: AxiosInstance;

client.subscribe((value) => (clientValue = value));

export async function logoutUser() {
  await clientValue.get('/api/auth/logout');
  userInfo.set(null);
  setExpiration(0);
}
