<script lang="ts">
  import ModalDialog from '../common/ModalDialog.svelte';
  import Notice from '../common/Notice.svelte';
  import SelectableTaxon from '../components/SelectableTaxon.svelte';
  import { checkmarkIcon, plusIcon } from '../components/SelectionButton.svelte';
  import { client, errorReason, bubbleUpError } from '../stores/client';
  import { selectedTaxa } from '../stores/selectedTaxa';
  import type { TaxonSpec } from '../../shared/model';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection
  } from '../../frontend-core/selections_tree';
  import type { TaxonSelectionsTree } from '../../frontend-core/taxon_selections_tree';

  export let title: string;
  export let parentUnique: string;
  export let selectionsTree: TaxonSelectionsTree;
  export let getContainingTaxa: (
    ofTaxonSpec: TaxonSpec,
    includesGivenTaxon: boolean
  ) => Promise<SpecNode<TaxonSpec>[]>;
  export let addSelection: AddSelection<TaxonSpec>;
  export let removeSelection: RemoveSelection<TaxonSpec>;
  export let onClose: () => void;

  const ANCESTOR_ITEM_LEFT_MARGIN = 1.3; // em

  let parentSpec: TaxonSpec;
  let containingTaxa: SpecNode<TaxonSpec>[] = [];
  let childSpecs: TaxonSpec[];
  let selectedAncestorUniques: Record<string, boolean> = {};
  let allChildrenSelected = false;

  async function prepare() {
    // Look for the target taxon among the existing containing taxa, in
    // order to avoid unncessary API calls.

    let found = false;
    for (let i = 0; !found && i < containingTaxa.length; ++i) {
      const containingTaxon = containingTaxa[i];
      if (parentUnique == containingTaxon.spec.unique) {
        containingTaxa.length = i + 1;
        parentSpec = containingTaxon.spec;
        childSpecs = containingTaxon.children;
        found = true;
      }
    }

    // If the taxon is not already loaded, load it and all its ancestor
    // taxa, even if those ancestors are already cached, mainly to keep
    // the code simpler than it would otherwise be. API calls are
    // necessary, regardless.

    let res = await $client.post('api/taxa/get_list', {
      taxonUniques: [parentUnique]
    });
    const taxonSpecs: TaxonSpec[] = res.data.taxonSpecs;
    if (taxonSpecs.length == 0) {
      throw Error(`Failed to load taxon '${parentUnique}'`);
    }
    parentSpec = taxonSpecs[0];
    containingTaxa = await getContainingTaxa(parentSpec, true);
    childSpecs = containingTaxa[containingTaxa.length - 1].children;

    // Determine which ancestor taxa have been selected, if any.

    _determineAncestorSelections();
  }

  const gotoTaxon = async (taxonUnique: string) => {
    parentUnique = taxonUnique;
    await prepare();
  };
  const deselectAll = () => {
    for (const childSpec of childSpecs) {
      if (allChildrenSelected || selectionsTree.isSelected(childSpec.unique)) {
        selectionsTree.removeSelection(containingTaxa, childSpec);
      }
    }
    _updatedSelections(true);
    selectedTaxa.set(selectionsTree.getSelectionSpecs());
  };

  const selectAll = () => {
    for (const childSpec of childSpecs) {
      if (!selectionsTree.isSelected(childSpec.unique)) {
        selectionsTree.addSelection(childSpec);
      }
    }
    _updatedSelections(false);
    selectedTaxa.set(selectionsTree.getSelectionSpecs());
  };

  function _addSelection(spec: TaxonSpec) {
    addSelection(spec);
    _updatedSelections(false);
  }

  function _removeSelection(spec: TaxonSpec) {
    const ancestorContainingTaxa: SpecNode<TaxonSpec>[] = [];
    for (const containingTaxon of containingTaxa) {
      if (containingTaxon.spec.unique !== spec.unique) {
        ancestorContainingTaxa.push(containingTaxon);
      } else {
        break;
      }
    }
    removeSelection(ancestorContainingTaxa, spec);
    _updatedSelections(true);
  }

  function _updatedSelections(forRemoval: boolean) {
    if (forRemoval) {
      allChildrenSelected = false;
    }
    _determineAncestorSelections();
    childSpecs = childSpecs; // redraw children
  }

  function _determineAncestorSelections() {
    selectedAncestorUniques = {};
    allChildrenSelected = false;
    for (const containingTaxon of containingTaxa) {
      const spec = containingTaxon.spec;
      if (allChildrenSelected || selectionsTree.isSelected(spec.unique)) {
        selectedAncestorUniques[spec.unique] = true;
        allChildrenSelected = true;
      }
    }
  }
</script>

{#await prepare() then}
  <ModalDialog {title} contentClasses="taxa-browser-content">
    <div class="row info-row">
      <div class="col-auto mb-3 small">
        This box only shows taxa having records. Click on taxon links to navigate
        around. A plus ({@html plusIcon}) indicates a taxon that can be selected. A
        check ({@html checkmarkIcon}) indicates a taxon that has been selected. Click {@html plusIcon}
        or {@html checkmarkIcon} to toggle selections.
      </div>
    </div>
    <div class="container-md">
      <div class="row gx-2 ancestors-row">
        <div class="col">
          {#each containingTaxa as containingTaxon, i}
            {@const spec = containingTaxon.spec}
            <div class="row mb-1">
              <div class="col" style="margin-left: {ANCESTOR_ITEM_LEFT_MARGIN * i}em">
                <SelectableTaxon
                  prefixed={false}
                  selection={selectedAncestorUniques[spec.unique]}
                  {spec}
                  containingTaxa={containingTaxa.slice(0, i)}
                  clickable={!!spec.hasChildren && spec.unique != parentUnique}
                  {gotoTaxon}
                  addSelection={() => _addSelection(spec)}
                  removeSelection={() => _removeSelection(spec)}
                />
              </div>
            </div>
          {/each}
        </div>
      </div>
      <div class="row mt-2 mb-2 justify-content-end gx-2">
        <div class="col-auto">
          <button class="btn btn-minor" type="button" on:click={selectAll}
            >Select All</button
          >
        </div>
        <div class="col-auto">
          <button class="btn btn-minor" type="button" on:click={deselectAll}
            >Deselect All</button
          >
        </div>
        <div class="col-auto">
          <button class="btn btn-major" type="button" on:click={onClose}>Close</button>
        </div>
      </div>
      <div class="child-rows">
        {#each childSpecs as spec (spec.unique)}
          <div class="row mt-1 gx-3">
            <SelectableTaxon
              prefixed={false}
              selection={allChildrenSelected || selectionsTree.isSelected(spec.unique)}
              {spec}
              {containingTaxa}
              {gotoTaxon}
              addSelection={() => _addSelection(spec)}
              removeSelection={() => _removeSelection(spec)}
            />
          </div>
        {/each}
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
  {:else}
    {bubbleUpError(err)}
  {/if}
{/await}

<style lang="scss">
  @import '../variables.scss';

  :global(.taxa-browser-content) {
    margin: 0 auto;
  }

  .ancestors-row {
    margin: 0;
  }

  .info-row {
    margin: 0;
    opacity: $deemphOpacity;
  }
</style>
