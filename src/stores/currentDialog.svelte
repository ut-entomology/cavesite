<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  import type { DialogSpec } from '../common/VariableDialog.svelte';

  export const currentDialog = writable<DialogSpec | null>(null);
</script>