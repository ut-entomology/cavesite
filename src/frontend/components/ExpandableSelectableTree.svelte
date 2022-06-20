<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  import type { ModelSpec } from '../../shared/model';
  import type { ExpandableNode } from '../../frontend-core/selections_tree';
  import type { SpecNode } from '../../frontend-core/selections_tree';

  export let node: ExpandableNode<ModelSpec>;
  export let showRoot = true;
  export let containingSpecNodes: SpecNode<ModelSpec>[] = [];

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

  function _expandNode(node: ExpandableNode<ModelSpec>) {
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
    <slot
      config={{
        expanded,
        selection,
        spec: parentSpec,
        containingSpecNodes,
        toggledExpansion
      }}
    />
  {/if}
  {#if expanded}
    <div class="children">
      {#each node.children as childNode, i (childNode.spec.unique)}
        <svelte:self
          bind:this={childComponents[i]}
          node={childNode}
          containingSpecNodes={[
            ...containingSpecNodes,
            { spec: parentSpec, children: [] }
          ]}
        >
          <svelte:fragment let:config>
            <slot {config} />
          </svelte:fragment>
        </svelte:self>
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
