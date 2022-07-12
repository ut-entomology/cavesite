<script lang="ts">
  import ExpandableSelectable from '../../components/ExpandableSelectable.svelte';
  import TaxonText from './TaxonText.svelte';
  import type { ModelSpec } from '../../../shared/model';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection
  } from '../../../frontend-core/selections_tree';

  export let prefixed = true;
  export let expandable = true;
  export let expanded = false;
  export let selection: boolean;
  export let spec: ModelSpec;
  export let clickable = spec.hasChildren || false;
  export let containingSpecNodes: SpecNode<ModelSpec>[];
  export let gotoUnique: (taxonUnique: string) => Promise<void>;
  export let addSelection: AddSelection<ModelSpec>;
  export let removeSelection: RemoveSelection<ModelSpec>;
  export let toggledExpansion: (expanded: boolean) => void = () => {};
</script>

<ExpandableSelectable
  {prefixed}
  {expandable}
  {expanded}
  {selection}
  {spec}
  {containingSpecNodes}
  {addSelection}
  {removeSelection}
  {toggledExpansion}
>
  <TaxonText
    class={selection ? 'selection' : ''}
    {spec}
    {clickable}
    onClick={() => gotoUnique(spec.unique)}
  />
</ExpandableSelectable>

<style lang="scss">
  :global(.selection .taxon-name) {
    font-weight: bold;
  }
</style>
