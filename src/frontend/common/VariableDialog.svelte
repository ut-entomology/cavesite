<script lang="ts" context="module">
  export class DialogSpec {
    targetName: string;
    params: Record<string, any>;

    constructor(targetName: string, params: Record<string, any> = {}) {
      this.targetName = targetName;
      this.params = params;
    }
  }
</script>

<script lang="ts">
  import type { SvelteComponent } from 'svelte';
  import type { Writable } from 'svelte/store';

  export let globalDialog: Writable<DialogSpec | null>;
  export let toSvelteTarget: (targetName: string) => typeof SvelteComponent;
</script>

{#if $globalDialog !== null}
  <svelte:component
    this={toSvelteTarget($globalDialog.targetName)}
    {...$globalDialog.params}
  />
{/if}
