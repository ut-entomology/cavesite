<script lang="ts">
  import SelectableTaxon from '../components/SelectableTaxon.svelte';
  import type { TaxonNode } from '../stores/selectedTaxa.svelte';

  export let indent: number; // em to indent children
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
  {#each node.children as childNode}
    <div class="taxon-level" style="left-margin: {indent}em">
      <svelte:self
        {indent}
        node={childNode}
        {gotoTaxon}
        {addedSelection}
        {removedSelection}
      />
    </div>
  {/each}
</div>
