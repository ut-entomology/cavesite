/**
 * Utility for creating a svelte store that uses session storage.
 */

import { Writable, writable } from 'svelte/store';

export function createSessionStore<T, S = T>(
  key: string,
  initialValue: T,
  fromSavedData: (savedData: S) => T = (s) => s as any,
  toSavedData: (transientValue: T) => S = (t) => t as any
): Writable<T> {
  const setSessionStorage = (data: S) => {
    if (data === undefined) {
      throw Error("Can't set session store to undefined");
    }
    sessionStorage.setItem(key, JSON.stringify(data));
  };

  const savedDataJSON = sessionStorage.getItem(key);
  if (savedDataJSON) {
    initialValue = fromSavedData(JSON.parse(savedDataJSON));
  } else {
    setSessionStorage(toSavedData(initialValue));
  }

  const svelteStore = writable(initialValue);
  svelteStore.subscribe((value) => setSessionStorage(toSavedData(value)));

  return svelteStore;
}
