<script lang="ts">
  import Toast from './toast/Toast.svelte';
  import ToastHeader from './toast/Toast.svelte';
  import ToastBody from './toast/Toast.svelte';

  export let alert = 'light';
  export let header = 'Notice';
  export let message = '';

  let isOpen = true;

  const closeNotice = () => (isOpen = false);
</script>

{#if isOpen}
  <div
    class="notice-container p-3 position-fixed start-50 translate-middle bg-{alert} bg-opacity-75"
  >
    <Toast fade={false} on:close={closeNotice} on:close>
      <ToastHeader class="text-{alert}" toggle={closeNotice}>{header}</ToastHeader>
      <ToastBody>
        {@html message}
      </ToastBody>
    </Toast>
  </div>
{/if}

<style lang="scss">
  @import '../values.scss';

  .notice-container {
    top: $verticalMessagePosition !important;
  }
</style>
