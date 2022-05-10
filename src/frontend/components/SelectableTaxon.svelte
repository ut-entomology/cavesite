<script lang="ts" context="module">
  export const checkmarkIcon = '&#10003;';
  export const plusIcon = '+';
</script>

<script lang="ts">
  import CircleIconButton from '../components/CircleIconButton.svelte';
  import TaxonText from '../components/TaxonText.svelte';
  import type { TaxonSpec } from '../../shared/taxa';
  import { ContainingTaxon, selectedTaxa } from '../stores/selectedTaxa.svelte';

  export let isSelection: boolean;
  export let spec: TaxonSpec;
  export let containingTaxa: ContainingTaxon[] | null = null;
  export let gotoTaxon: (taxonUnique: string) => Promise<void>;
  export let addedSelection: () => void;
  export let removedSelection: () => void;

  const addSelection = (spec: TaxonSpec) => {
    $selectedTaxa!.addSelection(spec);
    addedSelection();
  };

  const removeSelection = (spec: TaxonSpec) => {
    $selectedTaxa!.removeSelection(spec, containingTaxa);
    removedSelection();
  };
</script>

<div class="taxon-row">
  {#if isSelection}
    <CircleIconButton
      class="selection taxon_selector"
      on:click={() => removeSelection(spec)}
      label="Remove from selections"
    >
      <div>{@html checkmarkIcon}</div>
    </CircleIconButton>
  {:else}
    <CircleIconButton
      class="taxon_selector"
      on:click={() => addSelection(spec)}
      label="Add to selections"
    >
      <div>{@html plusIcon}</div>
    </CircleIconButton>
  {/if}
  <TaxonText
    class={isSelection ? 'selection' : ''}
    {spec}
    clickable={spec.hasChildren || false}
    onClick={() => gotoTaxon(spec.unique)}
  />
</div>

<style lang="scss">
  @import '../variables.scss';

  :global(.taxon_selector) {
    display: inline-block;
    margin-top: -0.05rem;
    margin-right: 0.5rem;
    width: 1.4rem;
    height: 1.4rem;
    line-height: 1.1rem;
    font-size: 1.2rem;
    font-weight: bold;
  }

  :global(.selection .taxon-name) {
    font-weight: bold;
  }

  :global(.taxon_selector div) {
    margin-top: 0.05rem;
  }
</style>
