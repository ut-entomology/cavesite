import { writable } from 'svelte/store';

export type ErrorValues = { [key: string]: string };

export const groupErrorsKey = {};

export function createErrorsStore() {
  const { set, subscribe, update } = writable<ErrorValues>({});
  return {
    set,
    subscribe,
    setError: (name: string, error: string) => {
      update((errors) => {
        errors[name] = error;
        for (const key in errors) {
          if (errors[key]) return errors;
        }
        return {};
      });
    }
  };
}

export function toErrorText(errors: ErrorValues) {
  let text = '';
  for (const key in errors) {
    const error = errors[key];
    if (error) {
      if (text) text += '<br/>';
      text += normalizeError(error);
    }
  }
  return text;
}

export function normalizeError(error: string) {
  const requiredOffset = error.indexOf(' is a required field');
  if (requiredOffset > 0) {
    return error.substr(0, requiredOffset) + ' required';
  }
  return error;
}
