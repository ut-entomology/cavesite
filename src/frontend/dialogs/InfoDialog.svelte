<script lang="ts">
  import ModalDialog from '../common/ModalDialog.svelte';

  export let title: string;
  export let classes = '';
  export let maxWidth: string;
  export let onClose: (() => void) | null = null;
</script>

<ModalDialog {title} {maxWidth} {onClose} contentClasses={classes}>
  <div class="row mb-2">
    <div class="col">
      <slot />
    </div>
  </div>
  {#if onClose !== null}
    <div class="row mt-4 mb-2">
      <div class="col text-center">
        <button class="btn btn-major" type="button" on:click={onClose}>Close</button>
      </div>
    </div>
  {/if}
</ModalDialog>

<style>
  button {
    width: 6rem;
  }
</style>
