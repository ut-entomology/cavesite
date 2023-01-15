import type { Readable, Writable } from 'svelte/store';
import type { ObjectSchema } from 'yup';
import { createForm as createValidatingForm } from 'svelte-forms-lib';

type Values = { [key: string]: any; };

export type FormContext = {
  form: Writable<Values>;
  errors: Writable<Values>;
  touched: Writable<Values>;
  modified: Readable<Values>;
  isValid: Readable<boolean>;
  isSubmitting: Writable<boolean>;
  isValidating: Writable<boolean>;
  handleReset: () => void;
  handleChange: (event: Event) => any;
  handleSubmit: (event: Event) => any;
};

export type FormProps<T extends Values> = {
  context?: FormContext;
  initialValues?: T;
  onSubmit?: ((values: T) => any) | ((values: T) => Promise<any>);
  validate?: (values: T) => any | undefined;
  validationSchema?: ObjectSchema<any>;
};

export const formContextKey = {};

export function createForm<T extends Values>(formProps: FormProps<T>): FormContext {
  return createValidatingForm(formProps as any);
}
