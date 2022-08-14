/**
 * Svelte store providing a shared mechanism for communicating with the server.
 */

import { writable } from 'svelte/store';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { getReasonPhrase } from 'http-status-codes';

const REST_API_TIMEOUT_MILLIS = 20000;

const originalOrigin = window.location.origin;

const baseAxiosConfig: any = {
  baseURL: originalOrigin,
  timeout: REST_API_TIMEOUT_MILLIS,
  withCredentials: true
};
const publicClient = axios.create(baseAxiosConfig);

export const client = writable<AxiosInstance>(publicClient);

export const bubbleUpError = (err: any) => {
  throw err;
};

export function setCSRF(csrfToken: string | null) {
  if (csrfToken === null) {
    client.set(publicClient);
  } else {
    const config = Object.assign({}, baseAxiosConfig);
    client.set(axios.create(config));
  }
}

export function errorReason(res: AxiosResponse): string {
  return res.data?.message || getReasonPhrase(res.status);
}
