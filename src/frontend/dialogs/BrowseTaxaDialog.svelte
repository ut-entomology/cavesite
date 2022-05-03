<script lang="ts">
  import ModalDialog from '../common/ModalDialog.svelte';
  import Notice from '../common/Notice.svelte';
  import InputGroupButton from '../components/InputGroupButton.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import { client, errorReason, bubbleUpError } from '../stores/client';
  //  import { flashMessage } from '../common/VariableFlash.svelte';
  import { taxonRanks, TaxonInfo, nextUniqueName } from '../../shared/client_model';
  import { formatTaxonName } from '../stores/selectedTaxa.svelte';
  import { selectedTaxa } from '../stores/selectedTaxa.svelte';

  export let title: string;
  export let parentUnique: string;

  const loupeIcon = `<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
<g><path d="M497.938,430.063l-126.914-126.91C389.287,272.988,400,237.762,400,200C400,89.719,310.281,0,200,0
		C89.719,0,0,89.719,0,200c0,110.281,89.719,200,200,200c37.762,0,72.984-10.711,103.148-28.973l126.914,126.91
		C439.438,507.313,451.719,512,464,512c12.281,0,24.563-4.688,33.938-14.063C516.688,479.195,516.688,448.805,497.938,430.063z
		M64,200c0-74.992,61.016-136,136-136s136,61.008,136,136s-61.016,136-136,136S64,274.992,64,200z"/></g></svg>`;
  const checkmarkIcon = '&#10003;';
  const plusIcon = '+';

  let selectedTaxaByUnique: Record<string, TaxonInfo> = {};
  let typedTaxon = '';
  let parentInfo: TaxonInfo;
  let ancestorNames: string[];
  let childrenInfo: TaxonInfo[];

  if ($selectedTaxa) {
    for (const taxonInfo of $selectedTaxa.taxaInfo) {
      selectedTaxaByUnique[taxonInfo.unique] = taxonInfo;
    }
  }

  async function load() {
    let res = await $client.post('api/taxa/get_list', { taxonUniques: [parentUnique] });
    parentInfo = res.data.taxaInfo[0];
    res = await $client.post('api/taxa/get_children', { parentUnique });
    childrenInfo = res.data.taxaInfo;

    ancestorNames = [];
    let uniqueName = '';
    let i = 0;
    if (parentInfo.ancestors) {
      const ancestors = parentInfo.ancestors!.split('|');
      while (i < ancestors.length) {
        uniqueName = nextUniqueName(uniqueName, ancestorNames[i]);
        ancestorNames.push(formatTaxonName(taxonRanks[i], uniqueName, null));
        ++i;
      }
    }
    uniqueName = nextUniqueName(uniqueName, parentInfo.name);
    ancestorNames.push(formatTaxonName(taxonRanks[i], uniqueName, parentInfo.author));
  }

  const loadTypedTaxon = () => {
    console.log(`load ${typedTaxon}`);
  };

  const closeDialog = () => {
    $currentDialog = null;
  };
</script>

{#await load() then}
  <ModalDialog {title} contentClasses="taxa-browser-content">
    <div class="container-md">
      <div class="row align-items-center">
        <div class="col">
          <div class="input-group me-4">
            <input class="form-control" bind:value={typedTaxon} />
            <InputGroupButton on:click={loadTypedTaxon}>
              <div class="loupeIcon">{@html loupeIcon}</div>
            </InputGroupButton>
          </div>
        </div>
        <div class="col-auto">
          <button class="btn btn-major" type="button" on:click={closeDialog}
            >Close</button
          >
        </div>
      </div>
      <div class="row mt-3 mb-3 ancestors-row">
        <div class="col">
          {#each ancestorNames as ancestorName, i}
            <div class="row mt-1">
              <div class="col" style="margin-left: {1.5 * i}em">
                {@html ancestorName}
              </div>
            </div>
          {/each}
        </div>
      </div>
      {#each childrenInfo as childInfo}
        <div class="row mt-1">
          <div class="col-auto">
            {#if selectedTaxaByUnique[childInfo.unique]}
              <div class="addRemoveIcon">{@html checkmarkIcon}</div>
            {:else}
              <div class="addRemoveIcon">{@html plusIcon}</div>
            {/if}
          </div>
          <div class="col">
            {@html formatTaxonName(childInfo.rank, childInfo.name, childInfo.author)}
          </div>
        </div>
      {/each}
      <div class="row info-row">
        <div class="col-auto mt-4 small">
          This box only shows taxa for which there are records. Click on a taxon to
          navigate to it. A plus ({@html plusIcon}) indicates a taxon that can be
          selected. A check ({@html checkmarkIcon}) indicates a taxon that has been
          selected. Click on the {@html plusIcon} or {@html checkmarkIcon} to toggle the
          selection. Type taxa in the box for autocompletion assistance.
        </div>
      </div>
    </div>
  </ModalDialog>
{:catch err}
  {#if err.response}
    <Notice
      header="ERROR"
      alert="danger"
      message="Failed to load taxon '{parentUnique}':<br/>{errorReason(err.response)}"
      on:close={closeDialog}
    />
  {:else}{bubbleUpError(err)}{/if}
{/await}

<style lang="scss">
  @import '../variables.scss';

  :global(.taxa-browser-content) {
    margin: 0 auto;
  }

  .loupeIcon {
    margin-top: -0.1rem;
    width: 1.5rem;
    height: 1.5rem;
  }

  :global(.selection .taxon-name) {
    font-weight: bold;
  }

  .ancestors-row {
    margin: 0;
  }

  .info-row {
    margin: 0;
    opacity: $deemphOpacity;
  }
</style>
