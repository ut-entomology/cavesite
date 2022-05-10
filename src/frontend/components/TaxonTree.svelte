<script lang="ts">
  import SelectableTaxon from '../components/SelectableTaxon.svelte';
  import type { TaxonNode } from '../stores/selectedTaxa.svelte';

  export let node: TaxonNode;
  export let gotoTaxon: (taxonUnique: string) => Promise<void>;
  export let addedSelection: () => void;
  export let removedSelection: () => void;

  let parentSpec = node.taxonSpec;
</script>

<div class="taxon-level">
  <SelectableTaxon
    isSelection={node.children.length == 0}
    spec={parentSpec}
    {gotoTaxon}
    {addedSelection}
    {removedSelection}
  />
  {#each node.children as childNode (childNode.taxonSpec.unique)}
    <div class="taxon-level">
      <svelte:self node={childNode} {gotoTaxon} {addedSelection} {removedSelection} />
    </div>
  {/each}
</div>

<style>
  .taxon-level .taxon-level {
    margin-left: 1rem;
  }

  :global(.taxon-level .taxon-row) {
    margin-top: 0.25rem;
  }
</style>
