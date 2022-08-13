/**
 * Svelte store providing the name of the current page.
 * Used for setting the HTML page title.
 */

import { writable } from 'svelte/store';

export const pageName = writable<string>('');
