<script lang="ts">
  import ModalDialog from '../common/ModalDialog.svelte';
  import Notice from '../common/Notice.svelte';
  import InputGroupButton from '../components/InputGroupButton.svelte';
  import CircleIconButton from '../components/CircleIconButton.svelte';
  import TaxonText from '../components/TaxonText.svelte';
  import { client, errorReason, bubbleUpError } from '../stores/client';
  //  import { flashMessage } from '../common/VariableFlash.svelte';
  import { TaxonSpec, createTaxonSpecs } from '../../shared/taxa';
  import { selectedTaxa } from '../stores/selectedTaxa.svelte';

  const ANCESTOR_ITEM_LEFT_MARGIN = 1.3; // em

  export let title: string;
  export let parentUnique: string;
  export let onClose: () => void;

  const loupeIcon = `<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
<g><path d="M497.938,430.063l-126.914-126.91C389.287,272.988,400,237.762,400,200C400,89.719,310.281,0,200,0
		C89.719,0,0,89.719,0,200c0,110.281,89.719,200,200,200c37.762,0,72.984-10.711,103.148-28.973l126.914,126.91
		C439.438,507.313,451.719,512,464,512c12.281,0,24.563-4.688,33.938-14.063C516.688,479.195,516.688,448.805,497.938,430.063z
		M64,200c0-74.992,61.016-136,136-136s136,61.008,136,136s-61.016,136-136,136S64,274.992,64,200z"/></g></svg>`;
  const checkmarkIcon = '&#10003;';
  const plusIcon = '+';

  let typedTaxon = '';
  let parentSpec: TaxonSpec;
  let containingSpecs: TaxonSpec[];
  let childSpecs: TaxonSpec[];
  let selectedAncestorUniques: Record<string, boolean> = {};
  let allChildrenSelected = false;

  async function load() {
    let res = await $client.post('api/taxa/get_list', { taxonUniques: [parentUnique] });
    const taxonSpecs = res.data.taxonSpecs;
    if (taxonSpecs.length == 0) {
      throw Error(`Failed to load taxon '${parentUnique}'`);
    }
    parentSpec = taxonSpecs[0];
    res = await $client.post('api/taxa/get_children', { parentUnique });
    childSpecs = res.data.taxonSpecs;
    containingSpecs = createTaxonSpecs(parentSpec);
    containingSpecs.push(parentSpec);

    selectedAncestorUniques = {};
    allChildrenSelected = false;
    for (const containingSpec of containingSpecs) {
      const containingNode = $selectedTaxa?.nodesByTaxonUnique[containingSpec.unique];
      if (allChildrenSelected || (containingNode && containingNode.children === null)) {
        selectedAncestorUniques[containingSpec.unique] = true;
        allChildrenSelected = true;
      }
    }
  }

  const loadTypedTaxon = () => {
    console.log(`load ${typedTaxon}`);
  };

  const gotoTaxon = async (taxonUnique: string) => {
    parentUnique = taxonUnique;
    await load();
  };

  const addSelection = (spec: TaxonSpec) => {
    $selectedTaxa!.addSelection(spec);
    childSpecs = childSpecs; // redraw children
  };

  const removeSelection = (spec: TaxonSpec) => {
    $selectedTaxa!.removeTaxon(spec);
    allChildrenSelected = false;
    childSpecs = childSpecs; // redraw children
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
          <button class="btn btn-major" type="button" on:click={onClose}>Close</button>
        </div>
      </div>
      <div class="row mt-3 mb-3 ancestors-row">
        <div class="col">
          {#each containingSpecs as spec, i}
            <div class="row mt-1">
              <div class="col" style="margin-left: {ANCESTOR_ITEM_LEFT_MARGIN * i}em">
                <span class="ancestor_icon">
                  {@html selectedAncestorUniques[spec.unique]
                    ? checkmarkIcon
                    : '&bullet;'}
                </span>
                <TaxonText
                  {spec}
                  class={selectedAncestorUniques[spec.unique] ? 'selection' : ''}
                  clickable={spec.childCount === null}
                  onClick={() => gotoTaxon(spec.unique)}
                />
              </div>
            </div>
          {/each}
        </div>
      </div>
      {#each childSpecs as spec}
        {@const taxonNode = $selectedTaxa?.nodesByTaxonUnique[spec.unique]}
        {@const isSelection =
          allChildrenSelected || (taxonNode && taxonNode.children === null)}
        <div class="row mt-1 gx-3">
          <div class="col-auto">
            {#if isSelection}
              <CircleIconButton
                class="taxon_selector"
                on:click={() => removeSelection(spec)}
                label="Remove from selections"
              >
                {@html checkmarkIcon}
              </CircleIconButton>
            {:else}
              <CircleIconButton
                class="taxon_selector"
                on:click={() => addSelection(spec)}
                label="Add to selections"
              >
                {@html plusIcon}
              </CircleIconButton>
            {/if}
          </div>
          <div class="col">
            <TaxonText
              class={isSelection ? 'selection' : ''}
              {spec}
              clickable={!!spec.childCount}
              onClick={() => gotoTaxon(spec.unique)}
            />
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
      on:close={onClose}
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

  .ancestor_icon {
    margin-right: 0.4rem;
  }

  :global(.taxon_selector) {
    width: 1.4rem;
    height: 1.4rem;
    font-family: 'Courier New', Courier, 'Lucida Sans Typewriter', 'Lucida Typewriter',
      monospace;
    font-weight: bold;
    font-size: 0.9rem;
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
