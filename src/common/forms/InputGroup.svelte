<script lang="ts">
  import { setContext } from 'svelte';
  import { groupErrorsKey, createErrorsStore, toErrorText } from './form_errors';

  export let id: string | undefined = undefined;
  export let description = '';

  if (description && !id) {
    throw Error(`id required for description of InputGroup`);
  }

  const errorsStore = createErrorsStore();
  setContext(groupErrorsKey, errorsStore);
  let errors: {};
  errorsStore.subscribe((value) => {
    errors = value;
  });
</script>

<div
  class={errors != {} ? 'input-group is-invalid' : 'input-group'}
  aria-describedby={description ? id + '-form-text' : undefined}
>
  <slot />
</div>
{#if errors != {}}
  <div class="invalid-feedback">{toErrorText(errors)}</div>
{/if}
{#if description}
  <div id={id + '-form-text'} class="form-text">{@html description}</div>
{/if}
