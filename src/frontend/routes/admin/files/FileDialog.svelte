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
  import { keyDataInfoByKey, parseDataLines } from '../../../../shared/data_keys';
  import { loadKeyData, saveKeyData } from '../../../lib/key_data_client';
  import { client, globalClient } from '../../../stores/client';

  const BACKUP_MILLIS = 1000;

  export let fileSpec: FileSpec;
  export let close: () => void;

  const keyDataInfo = keyDataInfoByKey[fileSpec.dataKey];

  let saveDisabled = true;
  let closeLabel: string;
  let originalText = '';
  let text = $unsavedKeyData || '';
  let requestCancelConfirmation = false;
  let status: string;
  let errors: string[] = [];
  let warnings: string[] = [];
  let loadingWarnings = false;
  let warningStatus = '';
  let timer: NodeJS.Timeout | null = null;

  checkForErrors();

  $: if (text == originalText) {
    status = 'saved';
    $unsavedKeyData = null;
    saveDisabled = true;
    closeLabel = 'Close';
    errors = [];
  } else {
    if (timer === null) {
      // Don't restart timeout, as timer runs across pages in an SPA.
      setTimeout(() => {
        // Text might be saved before timeout.
        if (text != originalText) $unsavedKeyData = text;
        timer = null;
      }, BACKUP_MILLIS);
    }
    status = 'unsaved';
    saveDisabled = false;
    closeLabel = 'Cancel';
  }

  async function prepare() {
    originalText = (await loadKeyData($client, false, fileSpec.dataKey)) || '';
    if ($unsavedKeyData == null) {
      text = originalText;
    }
    if (keyDataInfo.checkTaxa && errors.length == 0) {
      loadTaxaWarnings(text);
    }
  }

  async function onSave() {
    checkForErrors();
    if (errors.length == 0) {
      if (keyDataInfo.checkTaxa) {
        loadTaxaWarnings(text);
      }
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
    errors = keyDataInfo.getErrors ? keyDataInfo.getErrors(text) : [];
  }

  const TAXA_RANKS = ['species', 'genus', 'family', 'order', 'class', 'phylum'];
  async function loadTaxaWarnings(text: string): Promise<void> {
    const lines = parseDataLines(text);
    const _warnings: string[] = [];
    loadingWarnings = true;
    showWarningStatus();
    for (let line of lines) {
      line = line.trim();
      if (line != '') {
        const lookupTaxon = line.split(',')[0].trim();
        const urlTaxon = lookupTaxon.replace(' ', '+');
        let matchedTaxon: string | undefined = undefined;
        let matchedRank: string | undefined = undefined;
        try {
          const res = await $globalClient.get(
            `https://api.gbif.org/v1/species/match?kingdom=Animalia&name=${urlTaxon}`
          );
          for (const rank of TAXA_RANKS) {
            matchedTaxon = res.data[rank];
            if (matchedTaxon && matchedTaxon != '') {
              matchedRank = rank;
              break;
            }
          }
          if (!matchedTaxon) {
            _warnings.push(`${formatTaxon(lookupTaxon)} not found in GBIF`);
          } else if (matchedTaxon != lookupTaxon) {
            _warnings.push(
              `${formatTaxon(lookupTaxon)} maps to ${matchedRank} ${formatTaxon(
                matchedTaxon
              )} in GBIF`
            );
          }
        } catch (err: any) {
          _warnings.push(`Error looking up ${formatTaxon(lookupTaxon)} on GBIF`);
        }
      }
    }
    warnings = _warnings; // render warnings
    loadingWarnings = false;
  }

  function showWarningStatus() {
    if (loadingWarnings) {
      warningStatus = warningStatus == '' ? 'checking taxa vs GBIF...' : '';
      setTimeout(showWarningStatus, warningStatus == '' ? 500 : 1500);
    } else {
      warningStatus = '';
    }
  }

  function formatTaxon(taxon: string): string {
    return taxon.includes(' ') ? `<i>${taxon}</i>` : taxon;
  }
</script>

<ModalDialog title="View/Edit {fileSpec.title}" contentClasses="file-dialog">
  <div class="row mb-2 instructions">
    <div class="col">{@html fileSpec.instructions}</div>
  </div>

  {#await prepare() then}
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
    {#if warnings.length > 0}
      <div id="warnings" class="col">
        <div class="warning_header">Warnings</div>
        <ul>
          {#each warnings as warning}
            <li>{@html warning}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="dialog_controls row gx-0">
      <div class="col-sm-2 status text-center">{status}</div>
      <div class="col-sm-5 status text-center">
        {#if loadingWarnings}
          {warningStatus}
        {:else}
          {warnings.length == 0 ? 'all taxa found on GBIF' : ''}
        {/if}
      </div>
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

  #errors,
  #warnings {
    border-radius: $border-radius;
    padding: 0 0.5em 0.5em 0.5em;
    margin: 1rem 0 0.5rem 0;
    font-size: 0.95rem;
  }
  .error_header,
  .warning_header {
    font-weight: bold;
    width: fit-content;
    margin: -0.8em 0 0.5em 1em;
    padding: 0 0.5em;
    background-color: white;
  }
  #errors {
    border: 1px solid red;
  }
  .error_header {
    color: red;
  }
  #warnings {
    border: 1px solid orange;
  }
  .warning_header {
    color: orange;
  }
  ul {
    margin: 0.5rem 0;
  }
</style>
