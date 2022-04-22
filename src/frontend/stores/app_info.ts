import { writable } from 'svelte/store';

import type { AppInfo } from '../../shared/user_auth';

export const appInfo = writable<AppInfo>();
