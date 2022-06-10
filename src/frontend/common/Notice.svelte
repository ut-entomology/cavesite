<script lang="ts">
  import { Toast, ToastHeader, ToastBody } from 'sveltestrap';

  export let alert = 'light';
  export let header = 'Notice';
  export let message = '';
  export let button: string | null = null;

  let isOpen = true;

  const closeNotice = () => (isOpen = false);
</script>

{#if isOpen}
  <div class="disable-clicks">
    <div
      class="notice-container p-3 position-fixed start-50 translate-middle bg-{alert} bg-opacity-75"
    >
      <Toast fade={false} on:close={closeNotice} on:close>
        <ToastHeader class="text-{alert}" toggle={button ? undefined : closeNotice}
          >{header}</ToastHeader
        >
        <ToastBody>
          {@html message}
          {#if button}
            <div class="button">
              <button class="btn btn-major" type="button" on:click={closeNotice}
                >{button}</button
              >
            </div>
          {/if}
        </ToastBody>
      </Toast>
    </div>
  </div>
{/if}

<style lang="scss">
  @import '../variables.scss';

  .notice-container {
    top: $verticalMessagePosition !important;
  }

  .button {
    margin-top: 1em;
    text-align: center;
  }
</style>
