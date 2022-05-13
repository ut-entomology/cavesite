<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  import type { TaxonSpec } from '../../shared/taxa';
  import type { TreeNode } from '../../frontend-core/selections_tree';
  import SelectableTaxon from '../components/SelectableTaxon.svelte';
  import type { SpecEntry } from '../../frontend-core/selections_tree';
  import type { TaxonSelectionsTree } from '../../frontend-core/taxon_selections_tree';

  export let node: TreeNode<TaxonSpec>;
  export let selectionsTree: TaxonSelectionsTree;
  export let containingTaxa: SpecEntry<TaxonSpec>[] = [];
  export let gotoTaxon: (taxonUnique: string) => Promise<void>;
  export let addedSelection: () => void;
  export let removedSelection: () => void;

  let parentSpec = node.spec;
  let expanded = node.expanded;
  let selection = node.children.length == 0;
  let childComponents: SvelteComponent[] = [];

  export function expandAll() {
    if (expanded) {
      childComponents.forEach((child) => child.expandAll());
    } else {
      _expandNode(node);
    }
    node.expanded = true;
    expanded = true;
  }

  function _expandNode(node: TreeNode<TaxonSpec>) {
    node.children.forEach((child) => _expandNode(child));
    node.expanded = true;
  }

  const toggledExpansion = (_expanded: boolean) => {
    expanded = _expanded;
    node.expanded = _expanded;
  };
</script>

<div class="taxon-level">
  <SelectableTaxon
    expandable={!selection}
    {expanded}
    {selection}
    spec={parentSpec}
    {selectionsTree}
    {containingTaxa}
    {gotoTaxon}
    {addedSelection}
    {removedSelection}
    {toggledExpansion}
  />
  {#if expanded}
    <div class="children">
      {#each node.children as childNode, i (childNode.spec.unique)}
        <svelte:self
          bind:this={childComponents[i]}
          node={childNode}
          containingTaxa={[...containingTaxa, { spec: parentSpec, children: [] }]}
          {selectionsTree}
          {gotoTaxon}
          {addedSelection}
          {removedSelection}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  :global(.taxon-level .taxon-level) {
    margin-left: 0.9rem;
  }

  :global(.taxon-row) {
    margin-top: 0.25rem;
  }

  .children {
    margin-left: 0.35rem;
    border-left: 1px solid #ddd;
  }
</style>
