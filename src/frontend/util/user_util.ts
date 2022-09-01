/**
 * User utilities shared across multiple pages.
 */

import type { AxiosInstance } from 'axios';

import type { LoginInfo } from '../../shared/user_auth';
import { client, setCsrfToken } from '../stores/client';
import { userInfo } from '../stores/user_info';
import { setExpiration } from './refresher';

let clientValue: AxiosInstance;

client.subscribe((value) => (clientValue = value));

export function loginUser(loginInfo: LoginInfo) {
  setCsrfToken(loginInfo.csrfToken!);
  userInfo.set(loginInfo.userInfo!);
  setExpiration(loginInfo.expiration!);
}

export async function logoutUser(initiate: boolean) {
  if (initiate) {
    await clientValue.get('/api/auth/logout');
  }
  setCsrfToken(null);
  userInfo.set(null);
  sessionStorage.clear();
  setExpiration(0);
}
