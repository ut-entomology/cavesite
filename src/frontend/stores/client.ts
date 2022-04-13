import { writable } from 'svelte/store';
import axios, { type AxiosInstance } from 'axios';

import { CSRF_TOKEN_HEADER } from '../../shared/user_auth';

const REST_API_TIMEOUT_MILLIS = 2000;

const baseAxiosConfig: any = {
  baseURL: process.env.CAVESITE_BASE_URL,
  timeout: REST_API_TIMEOUT_MILLIS
};
const publicClient = axios.create(baseAxiosConfig);

export const client = writable<AxiosInstance>(publicClient);

export function setCSRF(csrfToken: string | null) {
  if (csrfToken === null) {
    client.set(publicClient);
  } else {
    const config = Object.assign({}, baseAxiosConfig);
    config[CSRF_TOKEN_HEADER] = csrfToken;
    client.set(axios.create(config));
  }
}
