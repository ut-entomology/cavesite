<script lang="ts">
  import { Toast } from 'sveltestrap';

  export let message: string;

  function escapeHtml(unsafe: string) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
</script>

<div class="status-container position-fixed start-50 translate-middle">
  <Toast class="status-toast" isOpen={true} body fade={false}>
    {@html escapeHtml(message).replace(' ', '&nbsp;')}
  </Toast>
</div>

<style lang="scss">
  @import '../variables.scss';

  .status-container {
    top: $verticalMessagePosition !important;
    filter: brightness(135%) saturate(20%);
  }

  :global(.status-toast) {
    text-align: left;
    font-size: 110%;
    font-weight: bold;
    padding: 1em;
    background-color: rgb(255, 255, 255, 0.9);
  }
</style>
