<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import TaxonText from '../components/TaxonText.svelte';
  import BrowseTaxaDialog from '../dialogs/BrowseTaxaDialog.svelte';
  import { TaxonNode, selectedTaxa } from '../stores/selectedTaxa.svelte';
  import InteractiveTree, {
    InteractiveTreeFlags
  } from '../components/InteractiveTree.svelte';
  import { showNotice } from '../common/VariableNotice.svelte';

  export let treeRoot = $selectedTaxa ? $selectedTaxa.rootNode : null;

  let rootChildrenComponents: SvelteComponent[] = [];
  let browseTaxonUnique: string | null = null;

  const openTaxonBrowser = (taxonUnique: string) => {
    browseTaxonUnique = taxonUnique;
  };

  function treeIncludesSelections(node: TaxonNode): boolean {
    if (node.nodeFlags & InteractiveTreeFlags.Selected) return true;
    if (node.children) {
      for (const child of node.children) {
        if (treeIncludesSelections(child)) return true;
      }
    }
    return false;
  }

  function collapseAll() {
    if (treeRoot && treeRoot.children) {
      for (const treeRootChildComponent of rootChildrenComponents) {
        treeRootChildComponent.setExpansion(() => false);
      }
    }
  }

  function deselectAll() {
    if (treeRoot && treeRoot.children) {
      for (const treeRootChildComponent of rootChildrenComponents) {
        treeRootChildComponent.deselectAll();
      }
    }
  }

  function expandAll() {
    if (treeRoot && treeRoot.children) {
      for (const treeRootChildComponent of rootChildrenComponents) {
        treeRootChildComponent.setExpansion(() => true);
      }
    }
  }

  function removeCheckedTaxa() {
    if (
      $selectedTaxa &&
      $selectedTaxa.rootNode &&
      treeIncludesSelections($selectedTaxa.rootNode)
    ) {
      $selectedTaxa.dropCheckedTaxa();
      $selectedTaxa.save();
    } else {
      showNotice({ message: 'No taxa selected.', header: 'FAILED', alert: 'warning' });
    }
  }

  function selectAll() {
    if (treeRoot && treeRoot.children) {
      for (const treeRootChildComponent of rootChildrenComponents) {
        treeRootChildComponent.setSelection(true);
      }
    }
  }
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
          on:click={() => openTaxonBrowser('Animalia')}>Browse Taxa</button
        >
      </span>
      <span slot="work-buttons">
        <div class="col-auto">
          <button class="btn btn-minor compact" type="button" on:click={expandAll}
            >Expand All</button
          >
          <button class="btn btn-minor compact" type="button" on:click={collapseAll}
            >Collapse All</button
          >
          <button class="btn btn-minor compact" type="button" on:click={selectAll}
            >Check All</button
          >
          <button class="btn btn-minor compact" type="button" on:click={deselectAll}
            >Uncheck All</button
          >
          <button
            class="btn btn-minor compact"
            type="button"
            on:click={removeCheckedTaxa}>Remove Checked Taxa</button
          >
        </div>
      </span>
    </TabHeader>
    <div class="tree_area">
      {#if !treeRoot || !treeRoot.children}
        <EmptyTab message="No taxa selected" />
      {:else}
        {#each treeRoot.children as child, i}
          <InteractiveTree bind:this={rootChildrenComponents[i]} tree={child} let:tree>
            <TaxonText spec={tree.taxonSpec} />
          </InteractiveTree>
        {/each}
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
</style>
