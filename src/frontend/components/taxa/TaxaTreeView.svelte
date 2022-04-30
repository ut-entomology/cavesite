<script lang="ts" context="module">
  import type { TaxonNode } from '../../stores/included_taxa.svelte';
</script>

<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  import TabInstructions from '../TabInstructions.svelte';
  import InteractiveTree, { InteractiveTreeFlags } from '../InteractiveTree.svelte';
  import type { InteractiveTreeNode } from '../InteractiveTree.svelte';

  export let title: string;
  export let instructions: string;
  export let note: string;
  export let treeRoot: TaxonNode | null;

  let rootChildrenComponents: SvelteComponent[] = [];

  export function collapseAll() {
    if (treeRoot && treeRoot.children) {
      for (const treeRootChildComponent of rootChildrenComponents) {
        treeRootChildComponent.setExpansion(() => false);
      }
    }
  }

  export function deselectAll() {
    if (treeRoot && treeRoot.children) {
      for (const treeRootChildComponent of rootChildrenComponents) {
        treeRootChildComponent.deselectAll();
      }
    }
  }

  export function expandAll() {
    if (treeRoot && treeRoot.children) {
      for (const treeRootChildComponent of rootChildrenComponents) {
        treeRootChildComponent.setExpansion(() => true);
      }
    }
  }

  export function expandToIncludedTaxa() {
    if (treeRoot) {
      if (treeRoot.children) {
        for (const treeRootChildComponent of rootChildrenComponents) {
          treeRootChildComponent.setExpansion((node: InteractiveTreeNode) => {
            return node.children !== null;
          });
        }
      }
      _expandToSelections(treeRoot);
    }
  }

  export function selectAll() {
    if (treeRoot && treeRoot.children) {
      for (const treeRootChildComponent of rootChildrenComponents) {
        treeRootChildComponent.setSelection(true);
      }
    }
  }

  function _expandToSelections(node: TaxonNode) {
    if (node.nodeFlags & InteractiveTreeFlags.Selected) {
      // don't further expand under containing selection
      return true;
    }
    let containsSelection = false;
    if (node.children) {
      for (const child of node.children) {
        if (_expandToSelections(child)) {
          node.nodeFlags |= InteractiveTreeFlags.Expanded;
          containsSelection = true;
        }
      }
    }
    return containsSelection;
  }
</script>

<main>
  <TabInstructions>{@html instructions}</TabInstructions>
  <div class="container-lg">
    <div class="row mt-2 mb-2 justify-content-between">
      <div class="col-auto title">
        {@html title}
        <slot name="title-button" />
      </div>
      <div class="col-auto">
        <slot name="main-buttons" />
      </div>
    </div>
    <div class="row mb-2 justify-content-between">
      <div class="col-auto">
        <slot name="tree-buttons" />
      </div>
      <div class="col-auto included_note">({@html note})</div>
    </div>
  </div>
  <div class="tree_area">
    {#if !treeRoot || !treeRoot.children}
      No taxa selected
    {:else}
      {#each treeRoot.children as child, i}
        <InteractiveTree bind:this={rootChildrenComponents[i]} tree={child} />
      {/each}
    {/if}
  </div>
</main>

<style>
  main {
    flex: auto;
    display: flex;
    flex-direction: column;
  }
  main :global(button) {
    margin-left: 0.5em;
  }
  .title {
    font-weight: bold;
  }
  .included_note {
    padding: 0.4em 1.5em 0 0;
    font-size: 0.9em;
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
</style>
