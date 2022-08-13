/**
 * Svelte store characterizing the currently logged in user.
 */

import { writable } from 'svelte/store';

import type { UserInfo } from '../../shared/user_auth';

export const userInfo = writable<UserInfo | null>(null);
