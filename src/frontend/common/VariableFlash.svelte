<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  interface Message {
    text: string;
    alert: string;
  }

  const messageStore = writable<Message | null>(null);

  export function flashMessage(
    text: string,
    alert = 'warning',
    millis = 1250
  ): Promise<void> {
    messageStore.set({ text, alert });
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        closeToast();
        resolve();
      }, millis);
    });
  }

  function closeToast() {
    messageStore.set(null);
  }
</script>

<script lang="ts">
  import Toast from './toast/Toast.svelte';
</script>

{#if $messageStore}
  <div class="flash-container position-fixed start-50 translate-middle">
    <Toast
      class="flash-toast bg-{$messageStore.alert}"
      isOpen={$messageStore !== null}
      body
      fade={false}
      on:close={closeToast}
    >
      {$messageStore.text}
    </Toast>
  </div>
{/if}

<style lang="scss">
  @import '../variables.scss';

  .flash-container {
    top: $verticalMessagePosition !important;
    filter: brightness(135%) saturate(20%);
  }

  :global {
    .flash-toast {
      text-align: center;
      font-size: 110%;
      font-weight: bold;
      padding: 1em;
    }
  }
</style>
