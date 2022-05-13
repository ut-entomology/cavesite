<script lang="ts">
  import SelectableTaxon, { TreeFlags } from '../components/SelectableTaxon.svelte';
  import type { TaxonSpec } from '../../shared/taxa';
  import type { TreeNode } from '../../frontend-core/selections_tree';
  import type { SpecEntry } from '../../frontend-core/selections_tree';
  import type { TaxonSelectionsTree } from '../../frontend-core/taxon_selections_tree';

  export let node: TreeNode<TaxonSpec>;
  export let selectionsTree: TaxonSelectionsTree;
  export let containingTaxa: SpecEntry<TaxonSpec>[] = [];
  export let gotoTaxon: (taxonUnique: string) => Promise<void>;
  export let addedSelection: () => void;
  export let removedSelection: () => void;

  let parentSpec = node.spec;

  let flags = TreeFlags.Prefixed;

  function setFlags() {
    if (node.children.length == 0) {
      flags |= TreeFlags.Selected;
    } else {
      flags |= TreeFlags.Expandable;
      if (node.expanded) {
        flags |= TreeFlags.Expanded;
      }
    }
  }
  setFlags();

  const toggledExpansion = (expanded: boolean) => {
    console.log('**** expanding', expanded);
    if (expanded) {
      flags |= TreeFlags.Expanded;
    } else {
      flags &= ~TreeFlags.Expanded;
    }
  };
</script>

<div class="taxon-level">
  <SelectableTaxon
    {flags}
    spec={parentSpec}
    {selectionsTree}
    {containingTaxa}
    {gotoTaxon}
    {addedSelection}
    {removedSelection}
    {toggledExpansion}
  />
  {#if flags & TreeFlags.Expanded}
    {#each node.children as childNode (childNode.spec.unique)}
      <div class="taxon-level">
        <svelte:self
          node={childNode}
          containingTaxa={[...containingTaxa, { spec: parentSpec, children: [] }]}
          {selectionsTree}
          {gotoTaxon}
          {addedSelection}
          {removedSelection}
        />
      </div>
    {/each}
  {/if}
</div>

<style>
  .taxon-level .taxon-level {
    margin-left: 0.5rem;
  }

  :global(.taxon-level .taxon-row) {
    margin-top: 0.25rem;
  }
</style>
