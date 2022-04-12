import { writable } from 'svelte/store';

import type { UserInfo } from '../../shared/user_auth';

export const user = writable<UserInfo | null>(null);
