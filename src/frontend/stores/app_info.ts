import { writable } from 'svelte/store';

export interface AppInfo {
  title: string;
  subtitle: string;
}

export const appInfo = writable<AppInfo>();
