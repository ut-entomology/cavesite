<script lang="ts" context="module">
  // Useful with argument expansion.
  export interface ConfirmationDetails {
    alert?: string;
    header?: string;
    message: string;
    okayButton: string;
    cancelButton?: string;
    onOkay: () => any;
    onCancel: () => any;
  }
</script>

<script lang="ts">
  import { Toast, ToastHeader, ToastBody } from 'sveltestrap';

  export let alert = 'danger';
  export let header = 'CAUTION';
  export let message: string;
  export let cancelButton = 'Cancel';
  export let okayButton: string;
  export let onCancel: () => void;
  export let onOkay: () => void;
</script>

<div
  class="notice-container p-3 position-fixed start-50 translate-middle bg-{alert} bg-opacity-75"
>
  <Toast fade={false}>
    <ToastHeader class="text-{alert}">{header}</ToastHeader>
    <ToastBody>
      <div>{@html message}</div>
      <div class="buttons">
        <button class="btn btn-minor" type="button" on:click={onCancel}
          >{cancelButton}</button
        >
        <button class="btn btn-major" type="button" on:click={onOkay}
          >{okayButton}</button
        >
      </div>
    </ToastBody>
  </Toast>
</div>

<style lang="scss">
  @import '../variables.scss';

  .notice-container {
    top: $verticalMessagePosition !important;
  }

  .buttons {
    margin-top: 1em;
    text-align: right;
  }

  .buttons button {
    margin-left: 1em;
  }
</style>
