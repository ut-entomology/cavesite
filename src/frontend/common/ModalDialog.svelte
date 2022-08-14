<script lang="ts">
  import Modal from './Modal.svelte';
  import Dialog from './Dialog.svelte';

  export let title: string;
  export let dialogClasses = '';
  export let contentClasses = '';
  export let maxWidth = '';
  export let onClose: (() => void) | null = null;
</script>

<Modal {contentClasses} {dialogClasses} {maxWidth} {onClose} let:scrollToModalTop>
  <Dialog {title}>
    <slot {scrollToModalTop} />
  </Dialog>
</Modal>
