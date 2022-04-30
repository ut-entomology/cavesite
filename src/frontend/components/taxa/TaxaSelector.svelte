<script lang="ts">
  import { TaxonNode, includedTaxa } from '../../stores/included_taxa.svelte';
  import { InteractiveTreeFlags } from '../InteractiveTree.svelte';
  import TaxaTreeView from './TaxaTreeView.svelte';
  import { showNotice } from '../../common/VariableNotice.svelte';

  let treeView: TaxaTreeView;

  function treeIncludesSelections(node: TaxonNode): boolean {
    if (node.nodeFlags & InteractiveTreeFlags.Selected) return true;
    if (node.children) {
      for (const child of node.children) {
        if (treeIncludesSelections(child)) return true;
      }
    }
    return false;
  }

  function browseTaxa() {}

  function excludeCheckedTaxa() {
    if ($includedTaxa && treeIncludesSelections($includedTaxa.treeRoot)) {
      $includedTaxa.dropSelectedTaxa();
      $includedTaxa.save();
    } else {
      showNotice({ message: 'No taxa selected.', header: 'FAILED', alert: 'warning' });
    }
  }

  function includeAllTaxa() {}
</script>

<TaxaTreeView
  bind:this={treeView}
  title="Taxa selected for inclusion"
  instructions="Select the taxa to which you would like to restrict search results."
  note="included taxa are in <b>bold</b>"
  treeRoot={$includedTaxa ? $includedTaxa.treeRoot : null}
>
  <span slot="main-buttons">
    <button class="btn btn-major" type="button" on:click={browseTaxa}
      >Browse Taxa</button
    >
  </span>
  <span slot="tree-buttons">
    <button class="btn btn-minor compact" type="button" on:click={treeView.deselectAll}
      >Uncheck All</button
    >
    <button class="btn btn-minor compact" type="button" on:click={excludeCheckedTaxa}
      >Exclude Checked Taxa</button
    >
    <button class="btn btn-minor compact" type="button" on:click={includeAllTaxa}
      >Drop Taxa Restrictions</button
    >
  </span>
</TaxaTreeView>
