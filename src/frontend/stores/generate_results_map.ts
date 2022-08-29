/**
 * Svelte store indicating whether to generate a map for the current query.
 */

import { writable } from 'svelte/store';

export const generateResultsMap = writable<boolean>(false);
