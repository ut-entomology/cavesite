<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import TaxonTree from '../components/TaxonTree.svelte';
  import BrowseTaxaDialog from '../dialogs/BrowseTaxaDialog.svelte';
  import { TaxonSelectionsTree } from '../../frontend-core/taxon_selections_tree';
  import type { TaxonSpec } from '../../shared/taxa';
  import type { TreeNode } from '../../frontend-core/selections_tree';
  import { selectedTaxa } from '../stores/selectedTaxa.svelte';
  import { ROOT_TAXON } from '../../shared/taxa';

  let browseTaxonUnique: string | null = null;
  let rootNode: TreeNode<TaxonSpec> | null = null;

  const selectionsTree = new TaxonSelectionsTree(
    $selectedTaxa ? Object.values($selectedTaxa) : []
  );
  $: $selectedTaxa, (rootNode = selectionsTree.getRootNode());

  const openTaxonBrowser = (taxonUnique: string) => {
    browseTaxonUnique = taxonUnique;
  };
</script>

<DataTabRoute activeTab="Taxa">
  <div class="container-fluid">
    <TabHeader
      title="Selected Taxa"
      instructions="Other tabs optionally restrict taxa to the selections shown here in <b>bold</b>."
    >
      <span slot="main-buttons">
        <button
          class="btn btn-major"
          type="button"
          on:click={() => openTaxonBrowser(ROOT_TAXON)}>Browse Taxa</button
        >
      </span>
    </TabHeader>

    <div class="tree_area">
      {#if !rootNode}
        <EmptyTab message="No taxa selected" />
      {:else}
        <div class="container-fluid gx-1">
          <TaxonTree
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
    margin: 1.5rem 0;
  }
</style>
