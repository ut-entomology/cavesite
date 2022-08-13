/**
 * Svelte store indicating whether a tab is displaying its how-to page.
 * Used to decide whether embed the how-to on a page before data is loaded.
 */

import { writable } from 'svelte/store';

export const showingHowTo = writable<boolean>(false);
