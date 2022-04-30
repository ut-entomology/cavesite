import { Writable, writable } from 'svelte/store';

type NonFunctionProperties<T> = {
  [p in keyof T]: T[p] extends Function ? never : T[p];
};

export function createSessionStore<T>(
  key: string,
  initialValue: T,
  reconstruct?: (obj: NonFunctionProperties<T>) => T
): Writable<T> {
  const setSessionStorage = (value: T) => {
    if (value === undefined) {
      throw Error("Can't set session store to undefined");
    }
    sessionStorage.setItem(key, JSON.stringify(value));
  };

  const sessionValueJSON = sessionStorage.getItem(key);
  if (sessionValueJSON) {
    const sessionValue = JSON.parse(sessionValueJSON);
    initialValue = reconstruct ? reconstruct(sessionValue) : sessionValue;
  } else {
    setSessionStorage(initialValue);
  }

  const svelteStore = writable(initialValue);
  svelteStore.subscribe((value) => setSessionStorage(value));

  return svelteStore;
}
