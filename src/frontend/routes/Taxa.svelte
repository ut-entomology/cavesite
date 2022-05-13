<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  import ConfirmationRequest from '../common/ConfirmationRequest.svelte';
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import TaxonTree from '../components/TaxonTree.svelte';
  import { plusIcon, checkmarkIcon } from '../components/SelectableTaxon.svelte';
  import BrowseTaxaDialog from '../dialogs/BrowseTaxaDialog.svelte';
  import { TaxonSelectionsTree } from '../../frontend-core/taxon_selections_tree';
  import type { TaxonSpec } from '../../shared/taxa';
  import type { TreeNode } from '../../frontend-core/selections_tree';
  import { selectedTaxa } from '../stores/selectedTaxa.svelte';
  import { ROOT_TAXON } from '../../shared/taxa';

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
            {selectionsTree}
            gotoTaxon={async (unique) => openTaxonBrowser(unique)}
            addedSelection={() => {}}
            removedSelection={() => {}}
          />
        </div>
      {/if}
    </div>
  </div>
</DataTabRoute>

{#if requestClearConfirmation}
  <ConfirmationRequest
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
