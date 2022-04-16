import { writable } from 'svelte/store';
import axios, { type AxiosInstance } from 'axios';

import { CSRF_TOKEN_HEADER } from '../../shared/user_auth';

const REST_API_TIMEOUT_MILLIS = 2000;

const originalOrigin = window.location.origin;

const baseAxiosConfig: any = {
  baseURL: originalOrigin,
  timeout: REST_API_TIMEOUT_MILLIS,
  withCredentials: true
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
