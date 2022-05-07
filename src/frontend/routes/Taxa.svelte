<script lang="ts">
  import { type SvelteComponent, onMount } from 'svelte';

  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import TaxonTree from '../components/TaxonTree.svelte';
  import BrowseTaxaDialog from '../dialogs/BrowseTaxaDialog.svelte';
  import { selectedTaxa } from '../stores/selectedTaxa.svelte';
  import { ROOT_TAXON } from '../../shared/taxa';

  const ITEM_LEFT_MARGIN = 1.5; // em

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
        <EmptyTab message="Loading..." />
      {:else}
        <div class="container gx-1">
          <TaxonTree
            indent={ITEM_LEFT_MARGIN}
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
    margin-left: -1.3em;
  }
  :global(.tree_area) :global(.tree_node) {
    margin: 0.3em 0 0 1.5em;
  }
  :global(.tree_area) :global(.bullet) {
    width: 1em;
    padding-left: 0.1em;
    opacity: 0.6;
  }
  :global(.tree_area) :global(.bullet.selectable) {
    padding-left: 0;
    opacity: 1;
  }
  :global(.tree_area) :global(input) {
    margin-right: 0.3em;
  }
  :global(.tree_area) :global(.checkbox) {
    vertical-align: middle;
  }
  :global(.tree_area) :global(span) {
    font-weight: bold;
  }

  :global(.tree_area .taxon_level) {
    margin-top: 0.5rem;
  }
</style>
