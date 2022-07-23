<script lang="ts">
  // Intended for use in VariableDialog.

  import Modal from './Modal.svelte';
  import Dialog from './Dialog.svelte';

  export let title: string;
  export let dialogClasses = '';
  export let contentClasses = '';
  export let maxWidth = '';
</script>

<Modal {contentClasses} {dialogClasses} {maxWidth} let:scrollToModalTop>
  <Dialog {title}>
    <slot {scrollToModalTop} />
  </Dialog>
</Modal>
