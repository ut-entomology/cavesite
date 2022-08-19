<script lang="ts" context="module">
  import type { DataKey } from '../../../../shared/data_keys';
  import { createSessionStore } from '../../../util/session_store';

  export interface FileSpec {
    dataKey: DataKey;
    title: string;
    instructions: string;
  }

  export const unsavedKeyData = createSessionStore<string | null>(
    'unsaved_key_data',
    null
  );
</script>

<script lang="ts">
  import ModalDialog from '../../../common/ModalDialog.svelte';
  import AutosizingTextArea from '../../../components/AutosizingTextArea.svelte';
  import ConfirmationRequest from '../../../common/ConfirmationRequest.svelte';
  import { dataValidatorsByKey } from '../../../../shared/data_keys';
  import { loadKeyData, saveKeyData } from '../../../lib/key_data_client';
  import { client } from '../../../stores/client';

  const BACKUP_MILLIS = 1000;

  export let fileSpec: FileSpec;
  export let close: () => void;

  let saveDisabled = true;
  let closeLabel: string;
  let originalText: string;
  let text = $unsavedKeyData || '';
  let requestCancelConfirmation = false;
  let status: string;
  let errors: string[] = [];
  let timer: NodeJS.Timeout | null = null;

  checkForErrors();

  $: if (text == originalText) {
    status = 'saved';
    $unsavedKeyData = null;
    saveDisabled = true;
    closeLabel = 'Close';
  } else {
    if (timer === null) {
      // Don't keep timer going, as it keeps going when changing pages in an SPA.
      setTimeout(() => {
        $unsavedKeyData = text;
        timer = null;
      }, BACKUP_MILLIS);
    }
    status = 'unsaved';
    saveDisabled = false;
    closeLabel = 'Cancel';
  }

  async function prepare() {
    originalText = (await loadKeyData($client, false, fileSpec.dataKey)) || '';
  }

  async function onSave() {
    checkForErrors();
    if (errors.length == 0) {
      await saveKeyData($client, false, fileSpec.dataKey, text);
      originalText = text;
    } else {
      document.body.scrollTop = document.documentElement.scrollTop = 0;
    }
  }

  function onClose() {
    if (text != originalText) {
      requestCancelConfirmation = true;
    } else {
      close();
    }
  }

  function confirmCancel() {
    requestCancelConfirmation = false;
    $unsavedKeyData = null;
    close();
  }

  function checkForErrors() {
    // @ts-ignore fact that not all keys are present in dataValidatorsByKey
    const validator = dataValidatorsByKey[fileSpec.dataKey];
    errors = validator(text);
  }
</script>

<ModalDialog title="View/Edit {fileSpec.title}" contentClasses="file-dialog">
  <div class="row mb-2 instructions">
    <div class="col">{fileSpec.instructions}</div>
  </div>

  {#await prepare() then}
    <div class="dialog_controls row gx-0">
      <div class="col status text-center">{status}</div>
      <div class="col text-end">
        <button
          class="btn btn-major"
          type="button"
          on:click={onSave}
          disabled={saveDisabled}>Save</button
        >
        <button class="btn btn-minor" type="button" on:click={onClose}
          >{closeLabel}</button
        >
      </div>
    </div>

    {#if errors.length > 0}
      <div id="errors" class="col">
        <div class="error_header">Please correct these errors</div>
        <ul>
          {#each errors as error}
            <li>{error}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <AutosizingTextArea bind:text />
  {/await}
</ModalDialog>

{#if requestCancelConfirmation}
  <ConfirmationRequest
    alert="warning"
    message="Discard changes?"
    okayButton="Discard"
    onOkay={confirmCancel}
    onCancel={() => (requestCancelConfirmation = false)}
  />
{/if}

<style lang="scss">
  @import '../../../variables.scss';

  .instructions {
    font-size: 0.95rem;
  }
  .status {
    //padding-left: 2rem;
    margin-top: 0.6rem;
    font-size: 0.95rem;
    color: #888;
  }
  .dialog_controls button {
    width: 6rem;
    margin-bottom: 0.5rem;
  }
  .dialog_controls button + button {
    margin-left: 0.75rem;
  }

  #errors {
    border-radius: $border-radius;
    border: 1px solid red;
    padding: 0 0.5em 0.5em 0.5em;
  }
  .error_header {
    font-weight: bold;
    width: fit-content;
    margin: -0.8em 0 0.5em 1em;
    padding: 0 0.5em;
    background-color: white;
    color: red;
  }
</style>
