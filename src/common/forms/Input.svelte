<script lang="ts" context="module">
  export type SetInputValue = (value: any) => Promise<void>;
</script>

<script lang="ts">
  import { getContext, tick } from 'svelte';
  import { formContextKey, type FormContext } from './form_context';
  import { groupErrorsKey, createErrorsStore, normalizeError } from './form_errors';

  // Component parameters

  export let id: string | undefined = undefined;
  export let name: string;

  let classAttr: string = '';
  export { classAttr as class };

  let typeAttr: string = 'text';
  export { typeAttr as type };

  export let description = '';
  if (description && !id) {
    throw Error(`id required for description of Input '${name}'`);
  }

  let element: HTMLInputElement;
  export const setValue: SetInputValue = async (value: any) => {
    switch (typeAttr) {
      case 'checkbox':
        element.checked = value;
        break;
      default:
        element.value = value;
    }
    await tick();
    element.dispatchEvent(new Event('change')); // force re-validation
  };

  // Derived values

  const inputClasses: { [key: string]: string } = {
    checkbox: 'form-check-input',
    text: 'form-control'
  };
  const baseClass = inputClasses[typeAttr] || inputClasses['text'];
  classAttr = classAttr ? baseClass + ' ' + classAttr : baseClass;

  // Handlers

  const { form, errors, handleChange } = getContext<FormContext>(formContextKey);

  const handleOnKeyUp = (event: Event) => {
    // Ensures that submit button doesn't move when pressed (thereby
    // ignoring the submit) as a result of error messages being removed.
    if ($errors[name]) {
      return handleChange(event);
    }
  };

  const groupErrors: ReturnType<typeof createErrorsStore> = getContext(groupErrorsKey);
  $: if (groupErrors) {
    groupErrors.setError(name, $errors[name]);
  }
</script>

<input
  {id}
  {name}
  class={!groupErrors && $errors[name] ? classAttr + ' is-invalid' : classAttr}
  type={typeAttr}
  value={$form[name]}
  on:change={handleChange}
  on:blur={handleChange}
  on:focus
  on:input
  on:keydown
  on:keypress
  on:keyup={handleOnKeyUp}
  aria-describedby={description ? id + '-form-text' : undefined}
  bind:this={element}
  {...$$restProps}
/>
{#if !groupErrors && $errors[name]}
  <div class="invalid-feedback">{normalizeError($errors[name])}</div>
{/if}
{#if description}
  <div id={id + '-form-text'} class="form-text">{@html description}</div>
{/if}
