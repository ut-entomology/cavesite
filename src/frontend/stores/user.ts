import { writable } from 'svelte/store';

import type { UserInfo } from '../../shared/user_info';

export const user = writable<UserInfo | null>(null);
