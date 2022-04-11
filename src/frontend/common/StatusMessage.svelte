<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  const messageStore = writable<string | null>(null);

  /**
   * Change the status message. Pass in null to close the status message,
   * but only if the StatusMessage component remains rendered.
   */
  export function showStatus(text: string | null) {
    if (text !== null) {
      text = escapeHtml(text).replace(' ', '&nbsp;');
    }
    messageStore.set(text);
  }

  // defined locally to keep this component complete
  function escapeHtml(unsafe: string) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
</script>

<script lang="ts">
  import Toast from './toast/Toast.svelte';
</script>

{#if $messageStore}
  <div class="status-container position-fixed start-50 translate-middle">
    <Toast class="status-toast" isOpen={$messageStore !== null} body fade={false}>
      {@html $messageStore}
    </Toast>
  </div>
{/if}

<style lang="scss">
  @import '../variables.scss';

  .status-container {
    top: $verticalMessagePosition !important;
    filter: brightness(135%) saturate(20%);
  }

  :global {
    .status-toast {
      text-align: left;
      font-size: 110%;
      font-weight: bold;
      padding: 1em;
    }
  }
</style>
