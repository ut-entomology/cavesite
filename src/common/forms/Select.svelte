<script lang="ts">
  import { getContext, tick } from 'svelte';
  import type { SetInputValue } from './Input.svelte';
  import { formContextKey, type FormContext } from './form_context';
  import { groupErrorsKey, createErrorsStore, normalizeError } from './form_errors';

  // Component parameters

  export let id: string | undefined = undefined;
  export let name: string;

  let classAttr: string = '';
  export { classAttr as class };

  export let description = '';
  if (description && !id) {
    throw Error(`id required for description of Input '${name}'`);
  }

  let element: HTMLSelectElement;
  export const setValue: SetInputValue = async (value: any) => {
    element.value = value;
    await tick();
    element.dispatchEvent(new Event('change')); // force re-validation
  };

  // Derived values

  const baseClass = 'form-select';
  classAttr = classAttr ? baseClass + ' ' + classAttr : baseClass;

  // Handlers

  const { form, errors, handleChange } = getContext<FormContext>(formContextKey);

  const groupErrors: ReturnType<typeof createErrorsStore> = getContext(groupErrorsKey);
  $: if (groupErrors) {
    groupErrors.setError(name, $errors[name]);
  }
</script>

<select
  {id}
  {name}
  class={!groupErrors && $errors[name] ? classAttr + ' is-invalid' : classAttr}
  value={$form[name]}
  on:change={handleChange}
  on:blur={handleChange}
  on:focus
  on:input
  aria-describedby={description ? id + '-form-text' : undefined}
  bind:this={element}
  {...$$restProps}
>
  <slot />
</select>
{#if !groupErrors && $errors[name]}
  <div class="invalid-feedback">{normalizeError($errors[name])}</div>
{/if}
{#if description}
  <div id={id + '-form-text'} class="form-text">{@html description}</div>
{/if}
