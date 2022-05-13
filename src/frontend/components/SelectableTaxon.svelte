<script lang="ts" context="module">
  export const checkmarkIcon = '&#10003;';
  export const plusIcon = '+';
</script>

<script lang="ts">
  import CircleIconButton from '../components/CircleIconButton.svelte';
  import TaxonText from '../components/TaxonText.svelte';
  import type { TaxonSpec } from '../../shared/taxa';
  import type { SpecEntry } from '../../frontend-core/selections_tree';
  import type { TaxonSelectionsTree } from '../../frontend-core/taxon_selections_tree';
  import { selectedTaxa } from '../stores/selectedTaxa.svelte';

  export let prefixed = true;
  export let expandable = true;
  export let expanded = false;
  export let selection: boolean;
  export let spec: TaxonSpec;
  export let containingTaxa: SpecEntry<TaxonSpec>[];
  export let selectionsTree: TaxonSelectionsTree;
  export let gotoTaxon: (taxonUnique: string) => Promise<void>;
  export let addedSelection: () => void;
  export let removedSelection: () => void;
  export let toggledExpansion: (expanded: boolean) => void = () => {};

  const EXPANDED_SYMBOL = '&#9660';
  const COLLAPSED_SYMBOL = '&#9654;';
  const UNEXPANDABLE_SYMBOL = '&#x2981;';

  let prefix: string | null = null;
  let toggle: (() => void) | null = null;
  let toggleLabel: string;

  $: if (prefixed) {
    if (expandable) {
      if (expanded) {
        prefix = EXPANDED_SYMBOL;
        toggle = () => toggledExpansion(false);
        toggleLabel = 'Collapse taxon';
      } else {
        prefix = COLLAPSED_SYMBOL;
        toggle = () => toggledExpansion(true);
        toggleLabel = 'Expand taxon';
      }
    } else {
      prefix = UNEXPANDABLE_SYMBOL;
    }
  }

  const addSelection = (spec: TaxonSpec) => {
    selectionsTree.addSelection(spec, true);
    selectedTaxa.set(selectionsTree.getSelectionSpecs());
    addedSelection();
  };

  const removeSelection = (spec: TaxonSpec) => {
    selectionsTree.removeSelection(containingTaxa, spec);
    selectedTaxa.set(selectionsTree.getSelectionSpecs());
    removedSelection();
  };
</script>

<div class="taxon-row">
  {#if prefix}
    <div class="expander" class:expandable title={toggleLabel} on:click={toggle}>
      {@html prefix}
    </div>
  {/if}
  {#if selection}
    <CircleIconButton
      class="selection taxon_selector"
      on:click={() => removeSelection(spec)}
      label="Remove from selections"
    >
      <div />
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
    class={selection ? 'selection' : ''}
    {spec}
    clickable={spec.hasChildren || false}
    onClick={() => gotoTaxon(spec.unique)}
  />
</div>

<style lang="scss">
  @import '../variables.scss';

  .expander {
    display: inline-block;
    color: #aaa;
    padding-left: 0.2rem;
    font-size: 0.6rem;
    vertical-align: text-bottom;
    width: 0.75rem;
  }

  .expandable {
    color: $blueLinkForeColor;
    cursor: pointer;
    padding: 0;
    font-size: 1rem;
    vertical-align: baseline;
  }

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

  :global(.selection.icon_button.taxon_selector div:after) {
    content: '\2713';
  }

  :global(.selection.icon_button.taxon_selector:hover div:after) {
    content: '-';
  }

  :global(.selection .taxon-name) {
    font-weight: bold;
  }

  :global(.taxon_selector div) {
    margin-top: 0.05rem;
  }
</style>
