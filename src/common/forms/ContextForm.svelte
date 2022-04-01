<script lang="ts">
  import { setContext } from 'svelte';
  import { formContextKey, type FormContext } from './form_context';

  export let context: FormContext;

  setContext(formContextKey, context);
</script>

<form on:submit={context.handleSubmit} {...$$restProps}>
  <slot />
</form>
