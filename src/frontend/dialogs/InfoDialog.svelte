<script lang="ts">
  import ModalDialog from '../common/ModalDialog.svelte';

  export let title: string;
  export let classes = '';
  export let maxWidth: string;
  export let onClose: () => void;
</script>

<ModalDialog {title} {maxWidth} contentClasses={classes}>
  <div class="row mb-2">
    <div class="col">
      <slot />
    </div>
  </div>
  <div class="row mt-4 mb-2">
    <div class="col text-center">
      <button class="btn btn-major" type="button" on:click={onClose}>Close</button>
    </div>
  </div>
</ModalDialog>

<style>
  button {
    width: 6rem;
  }
</style>
