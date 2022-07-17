<script lang="ts">
  import SelectionButton from '../components/SelectionButton.svelte';
  import type { ModelSpec } from '../../shared/model';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection
  } from '../../frontend-core/selections/selections_tree';

  export let prefixed = true;
  export let expandable = true;
  export let expanded = false;
  export let selection: boolean;
  export let spec: ModelSpec;
  export let containingSpecNodes: SpecNode<ModelSpec>[];
  export let addSelection: AddSelection<ModelSpec>;
  export let removeSelection: RemoveSelection<ModelSpec>;
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
        toggleLabel = 'Collapse';
      } else {
        prefix = COLLAPSED_SYMBOL;
        toggle = () => toggledExpansion(true);
        toggleLabel = 'Expand';
      }
    } else {
      prefix = UNEXPANDABLE_SYMBOL;
    }
  }
</script>

<div class="tree-row">
  {#if prefix}
    <div class="expander" class:expandable title={toggleLabel} on:click={toggle}>
      {@html prefix}
    </div>
  {/if}
  {#if selection || containingSpecNodes.length > 0}
    <SelectionButton
      selected={selection}
      addSelection={() => addSelection(spec)}
      removeSelection={() => removeSelection(containingSpecNodes, spec)}
    />
  {:else}
    <span class="root-icon">&bullet;</span>
  {/if}
  <slot />
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
    user-select: none;
  }

  .expandable {
    color: $blueLinkForeColor;
    cursor: pointer;
    padding: 0;
    font-size: 1rem;
    vertical-align: baseline;
  }

  .root-icon {
    margin: 0 0.7rem 0 0.3rem;
  }
</style>
