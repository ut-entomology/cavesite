/**
 * Svelte store providing a shared mechanism for communicating with the server.
 */

import { writable } from 'svelte/store';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { getReasonPhrase } from 'http-status-codes';

import { CSRF_TOKEN_HEADER } from '../../shared/user_auth';

const LOCAL_API_TIMEOUT_MILLIS = 10000;
const GLOBAL_API_TIMEOUT_MILLIS = 30000;

const originalOrigin = window.location.origin;

const localClientConfig: any = {
  baseURL: originalOrigin,
  timeout: LOCAL_API_TIMEOUT_MILLIS,
  withCredentials: true
};
const globalClientConfig: any = {
  baseURL: originalOrigin,
  timeout: GLOBAL_API_TIMEOUT_MILLIS,
  withCredentials: false
};

const _localClient = axios.create(localClientConfig);
const _globalClient = axios.create(globalClientConfig);

export const client = writable<AxiosInstance>(_localClient);
export const globalClient = writable<AxiosInstance>(_globalClient);

export const bubbleUpError = (err: any) => {
  throw err;
};

export function setCsrfToken(csrfToken: string | null) {
  if (csrfToken === null) {
    delete axios.defaults.headers.post[CSRF_TOKEN_HEADER];
    client.set(_localClient);
  } else {
    axios.defaults.headers.post[CSRF_TOKEN_HEADER] = csrfToken;
    client.set(axios.create(localClientConfig));
  }
}

export function errorReason(res: AxiosResponse): string {
  return res.data?.message || getReasonPhrase(res.status);
}
