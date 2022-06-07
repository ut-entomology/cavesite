<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  import ConfirmationRequest from '../common/ConfirmationRequest.svelte';
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import TaxonTree from '../components/TaxonTree.svelte';
  import { plusIcon, checkmarkIcon } from '../components/SelectionButton.svelte';
  import BrowseTaxaDialog from '../dialogs/BrowseTaxaDialog.svelte';
  import { TaxonSelectionsTree } from '../../frontend-core/taxon_selections_tree';
  import type { TaxonSpec } from '../../shared/model';
  //import { type TaxonSpec, createContainingTaxonSpecs } from '../../shared/model';
  import type { TreeNode, SpecEntry } from '../../frontend-core/selections_tree';
  import { selectedTaxa } from '../stores/selectedTaxa';
  import { client } from '../stores/client';
  import { ROOT_TAXON } from '../../shared/model';

  let browseTaxonUnique: string | null = null;
  let rootTree: SvelteComponent;
  let rootNode: TreeNode<TaxonSpec> | null = null;
  let requestClearConfirmation = false;

  const selectionsTree = new TaxonSelectionsTree(
    $selectedTaxa ? Object.values($selectedTaxa) : []
  );
  $: $selectedTaxa, (rootNode = selectionsTree.getRootNode());

  const expandTree = () => rootTree.expandAll();

  const clearSelections = () => (requestClearConfirmation = true);

  const openTaxonBrowser = (taxonUnique: string) => {
    browseTaxonUnique = taxonUnique;
  };

  const confirmClear = () => {
    requestClearConfirmation = false;
    if (rootNode) {
      selectionsTree.removeSelection([], rootNode.spec);
      selectedTaxa.set(selectionsTree.getSelectionSpecs());
    }
  };

  const cancelClear = () => (requestClearConfirmation = false);

  // async function getContainingTaxa(ofTaxonSpec: TaxonSpec) {
  //   const containingSpecs = createContainingTaxonSpecs(parentSpec);
  //   containingSpecs.push(parentSpec);

  //   // Load specs for the children of the parent taxon and each ancestor.

  //   const res = await $client.post('api/taxa/get_children', {
  //     parentUniques: containingSpecs.map((spec) => spec.unique)
  //   });
  //   const ancestorChildSpecs: TaxonSpec[][] = res.data.taxonSpecs;
  //   containingTaxa = [];
  //   for (const containingSpec of containingSpecs) {
  //     containingTaxa.push({
  //       spec: containingSpec,
  //       children: ancestorChildSpecs.shift()!
  //     });
  //   }
  //   return containingTaxa;
  // }

  function addSelection(spec: TaxonSpec) {
    selectionsTree.addSelection(spec);
    selectedTaxa.set(selectionsTree.getSelectionSpecs());
  }

  function removeSelection(containingTaxa: SpecEntry<TaxonSpec>[], spec: TaxonSpec) {
    selectionsTree.removeSelection(containingTaxa, spec);
    selectedTaxa.set(selectionsTree.getSelectionSpecs());
  }
</script>

<DataTabRoute activeTab="Taxa">
  <div class="container-fluid">
    <TabHeader
      title="Selected Taxa"
      instructions="This tab shows the taxa that you have selected for use in other tabs. Your selections are <b>{checkmarkIcon} checked and bold</b>. You may click on the {plusIcon} or {checkmarkIcon} to toggle selections, but this view is mainly useful for removing selections by clicking on the {checkmarkIcon}. Click on a blue taxon or on [Browse Taxa] to browse and add taxa."
    >
      <span slot="main-buttons">
        {#if rootNode}
          <button class="btn btn-minor" type="button" on:click={expandTree}
            >Expand All</button
          >
          <button class="btn btn-minor" type="button" on:click={clearSelections}
            >Clear</button
          >
        {/if}
        <button
          class="btn btn-major"
          type="button"
          on:click={() => openTaxonBrowser(ROOT_TAXON)}>Browse Taxa</button
        >
      </span>
    </TabHeader>

    <div class="tree_area">
      {#if !rootNode}
        <EmptyTab
          message="No taxa selected<div class='no-selection-paren'>(equivalent to selecting all taxa)</div>"
        />
      {:else}
        <div class="container-fluid gx-1">
          <TaxonTree
            bind:this={rootTree}
            node={rootNode}
            showRoot={false}
            gotoTaxon={async (unique) => openTaxonBrowser(unique)}
            {addSelection}
            {removeSelection}
          />
        </div>
      {/if}
    </div>
  </div>
</DataTabRoute>

{#if requestClearConfirmation}
  <ConfirmationRequest
    alert="warning"
    message="Clear these taxa selections?"
    okayButton="Clear"
    onOkay={confirmClear}
    onCancel={cancelClear}
  />
{/if}

{#if browseTaxonUnique !== null}
  <BrowseTaxaDialog
    title="Browse and Select Taxa"
    parentUnique={browseTaxonUnique}
    {selectionsTree}
    {addSelection}
    {removeSelection}
    onClose={() => {
      browseTaxonUnique = null;
    }}
  />
{/if}

<style>
  :global(.tree_area) {
    margin-bottom: 1.5rem;
  }

  :global(.tree_area .taxon_selector) {
    margin-right: 0;
  }
</style>
