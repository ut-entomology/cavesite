<script lang="ts">
  import { type SvelteComponent, onMount } from 'svelte';

  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import TaxonTree from '../components/TaxonTree.svelte';
  import BrowseTaxaDialog from '../dialogs/BrowseTaxaDialog.svelte';
  import { selectedTaxa } from '../stores/selectedTaxa.svelte';
  import { ROOT_TAXON } from '../../shared/taxa';

  let browseTaxonUnique: string | null = null;

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
      {#if !$selectedTaxa || !$selectedTaxa.rootNode}
        <EmptyTab message="No taxa selected" />
      {:else}
        <div class="container-fluid gx-1">
          <TaxonTree
            node={$selectedTaxa.rootNode}
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
    onClose={() => {
      browseTaxonUnique = null;
    }}
  />
{/if}

<style>
  :global(.tree_area) {
    margin-top: 1.5rem;
  }
</style>
