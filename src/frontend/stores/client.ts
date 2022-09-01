/**
 * Svelte store providing a shared mechanism for communicating with the server.
 */

import { writable } from 'svelte/store';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { getReasonPhrase } from 'http-status-codes';

import { CSRF_TOKEN_HEADER } from '../../shared/user_auth';

const REST_API_TIMEOUT_MILLIS = 20000;

const originalOrigin = window.location.origin;

const axiosConfig: any = {
  baseURL: originalOrigin,
  timeout: REST_API_TIMEOUT_MILLIS,
  withCredentials: true
};
const publicClient = axios.create(axiosConfig);

export const client = writable<AxiosInstance>(publicClient);

export const bubbleUpError = (err: any) => {
  throw err;
};

export function setCsrfToken(csrfToken: string | null) {
  if (csrfToken === null) {
    delete axios.defaults.headers.post[CSRF_TOKEN_HEADER];
    client.set(publicClient);
  } else {
    axios.defaults.headers.post[CSRF_TOKEN_HEADER] = csrfToken;
    client.set(axios.create(axiosConfig));
  }
}

export function errorReason(res: AxiosResponse): string {
  return res.data?.message || getReasonPhrase(res.status);
}
