/**
 * Svelte store containing server-provided application configuration.
 */

import { writable } from 'svelte/store';

import type { AppInfo } from '../../shared/app_info';

export const appInfo = writable<AppInfo>();
