<script lang="ts">
  // Intended for use in VariableDialog.

  import Modal from './Modal.svelte';
  import Dialog from './Dialog.svelte';

  export let title: string;
  export let dialogClasses = '';
  export let contentClasses = '';
</script>

<Modal {contentClasses} let:scrollToModelTop>
  <Dialog {title} class={dialogClasses}>
    <slot {scrollToModelTop} />
  </Dialog>
</Modal>
