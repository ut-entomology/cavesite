<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  import type { TaxonSpec } from '../../shared/model';
  import type { ExpandableNode } from '../../frontend-core/selections_tree';
  import SelectableTaxon from '../components/SelectableTaxon.svelte';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection
  } from '../../frontend-core/selections_tree';

  export let node: ExpandableNode<TaxonSpec>;
  export let showRoot = true;
  export let containingTaxa: SpecNode<TaxonSpec>[] = [];
  export let gotoTaxon: (taxonUnique: string) => Promise<void>;
  export let addSelection: AddSelection<TaxonSpec>;
  export let removeSelection: RemoveSelection<TaxonSpec>;

  let parentSpec = node.spec;
  let expanded = node.expanded;
  $: selection = node.children.length == 0;
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

  function _expandNode(node: ExpandableNode<TaxonSpec>) {
    node.children.forEach((child) => _expandNode(child));
    node.expanded = true;
  }

  const toggledExpansion = (_expanded: boolean) => {
    expanded = _expanded;
    node.expanded = _expanded;
  };
</script>

<div class:tree-level={showRoot}>
  {#if showRoot}
    <SelectableTaxon
      expandable={!selection}
      {expanded}
      {selection}
      spec={parentSpec}
      {containingTaxa}
      {gotoTaxon}
      {addSelection}
      {removeSelection}
      {toggledExpansion}
    />
  {/if}
  {#if expanded}
    <div class="children">
      {#each node.children as childNode, i (childNode.spec.unique)}
        <svelte:self
          bind:this={childComponents[i]}
          node={childNode}
          containingTaxa={[...containingTaxa, { spec: parentSpec, children: [] }]}
          {gotoTaxon}
          {addSelection}
          {removeSelection}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  :global(.tree-level .tree-level) {
    margin-left: 0.9rem;
  }

  :global(.tree-row) {
    margin-top: 0.25rem;
  }

  :global(.tree-level) .children {
    margin-left: 0.35rem;
    border-left: 1px solid #ddd;
  }
</style>
