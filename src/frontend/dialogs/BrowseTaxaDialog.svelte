<script lang="ts">
  import ModalDialog from '../common/ModalDialog.svelte';
  import Notice from '../common/Notice.svelte';
  import { checkmarkIcon, plusIcon } from '../components/SelectionButton.svelte';
  import { client, errorReason, bubbleUpError } from '../stores/client';
  import type { SelectedSpecsStore } from '../stores/selectedSpecs';
  import type { ModelSpec } from '../../shared/model';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection
  } from '../../frontend-core/selections_tree';
  import type { SelectionsTree } from '../../frontend-core/selections_tree';

  export let title: string;
  export let typeLabel: string;
  export let parentUnique: string;
  export let selectionsTree: SelectionsTree<ModelSpec>;
  export let selectedSpecsStore: SelectedSpecsStore;
  export let getContainingSpecNodes: (
    ofSpec: ModelSpec,
    includesGivenSpec: boolean
  ) => Promise<SpecNode<ModelSpec>[]>;
  export let addSelection: AddSelection<ModelSpec>;
  export let removeSelection: RemoveSelection<ModelSpec>;
  export let onClose: () => void;

  const ANCESTOR_ITEM_LEFT_MARGIN = 1.3; // em

  let parentSpec: ModelSpec;
  let containingSpecNodes: SpecNode<ModelSpec>[] = [];
  let childSpecs: ModelSpec[];
  let selectedAncestorUniques: Record<string, boolean> = {};
  let allChildrenSelected = false;

  async function prepare() {
    // Look for the target spec nodes among the existing containing
    // spec nodes, in order to avoid unncessary API calls.

    let found = false;
    for (let i = 0; !found && i < containingSpecNodes.length; ++i) {
      const containingSpecNode = containingSpecNodes[i];
      if (parentUnique == containingSpecNode.spec.unique) {
        containingSpecNodes.length = i + 1;
        parentSpec = containingSpecNode.spec;
        childSpecs = containingSpecNode.children;
        found = true;
      }
    }

    // If the spec node is not already loaded, load it and all its ancestor spec
    // nodes, even if those ancestors are already cached, mainly to keep the code
    // simpler than it would otherwise be. API calls are necessary, regardless.

    let res = await $client.post('api/taxa/get_list', {
      taxonUniques: [parentUnique]
    });
    const specs: ModelSpec[] = res.data.taxonSpecs;
    if (specs.length == 0) {
      throw Error(`Failed to load taxon '${parentUnique}'`);
    }
    parentSpec = specs[0];
    containingSpecNodes = await getContainingSpecNodes(parentSpec, true);
    childSpecs = containingSpecNodes[containingSpecNodes.length - 1].children;

    // Determine which ancestor spec nodes have been selected, if any.

    _determineAncestorSelections();
  }

  const gotoUnique = async (unique: string) => {
    parentUnique = unique;
    await prepare();
  };

  const deselectAll = () => {
    for (const childSpec of childSpecs) {
      if (allChildrenSelected || selectionsTree.isSelected(childSpec.unique)) {
        selectionsTree.removeSelection(containingSpecNodes, childSpec);
      }
    }
    _updatedSelections(true);
    selectedSpecsStore.set(selectionsTree.getSelectionSpecs());
  };

  const selectAll = () => {
    for (const childSpec of childSpecs) {
      if (!selectionsTree.isSelected(childSpec.unique)) {
        selectionsTree.addSelection(childSpec);
      }
    }
    _updatedSelections(false);
    selectedSpecsStore.set(selectionsTree.getSelectionSpecs());
  };

  function _addSelection(spec: ModelSpec) {
    addSelection(spec);
    _updatedSelections(false);
  }

  function _removeSelection(spec: ModelSpec) {
    const ancestorContainingSpecNodes: SpecNode<ModelSpec>[] = [];
    for (const containingSpecNode of containingSpecNodes) {
      if (containingSpecNode.spec.unique !== spec.unique) {
        ancestorContainingSpecNodes.push(containingSpecNode);
      } else {
        break;
      }
    }
    removeSelection(ancestorContainingSpecNodes, spec);
    _updatedSelections(true);
  }

  function _updatedSelections(forRemoval: boolean) {
    if (forRemoval) {
      allChildrenSelected = false;
    }
    _determineAncestorSelections();
    childSpecs = childSpecs; // redraw children
  }

  function _determineAncestorSelections() {
    selectedAncestorUniques = {};
    allChildrenSelected = false;
    for (const containingSpecNode of containingSpecNodes) {
      const spec = containingSpecNode.spec;
      if (allChildrenSelected || selectionsTree.isSelected(spec.unique)) {
        selectedAncestorUniques[spec.unique] = true;
        allChildrenSelected = true;
      }
    }
  }
</script>

{#await prepare() then}
  <ModalDialog {title} contentClasses="tree-browser-content">
    <div class="row info-row">
      <div class="col-auto mb-3 small">
        This box only shows {typeLabel} having records. Click on {typeLabel} links to navigate
        around. A plus ({@html plusIcon}) indicates a {typeLabel} that can be selected. A
        check ({@html checkmarkIcon}) indicates a {typeLabel} that has been selected. Click
        {@html plusIcon} or {@html checkmarkIcon} to toggle selections.
      </div>
    </div>
    <div class="container-md">
      <div class="row gx-2 ancestors-row">
        <div class="col">
          {#each containingSpecNodes as containingSpecNode, i}
            {@const spec = containingSpecNode.spec}
            {@const selectableConfig = {
              // svelte crashes with "TypeError: Cannot read properties of null
              //  (reading 'type')" if I use "{{...}}" notation.
              prefixed: false,
              selection: selectedAncestorUniques[spec.unique],
              spec,
              containingSpecNodes: containingSpecNodes.slice(0, i),
              clickable: !!spec.hasChildren && spec.unique != parentUnique,
              gotoUnique,
              addSelection: () => _addSelection(spec),
              removeSelection: () => _removeSelection(spec)
            }}
            <div class="row mb-1">
              <div class="col" style="margin-left: {ANCESTOR_ITEM_LEFT_MARGIN * i}em">
                <slot {selectableConfig} />
              </div>
            </div>
          {/each}
        </div>
      </div>
      <div class="row mt-2 mb-2 justify-content-end gx-2">
        <div class="col-auto">
          <button class="btn btn-minor" type="button" on:click={selectAll}
            >Select All</button
          >
        </div>
        <div class="col-auto">
          <button class="btn btn-minor" type="button" on:click={deselectAll}
            >Deselect All</button
          >
        </div>
        <div class="col-auto">
          <button class="btn btn-major" type="button" on:click={onClose}>Close</button>
        </div>
      </div>
      <div class="child-rows">
        {#each childSpecs as spec (spec.unique)}
          <div class="row mt-1 gx-3">
            <slot
              selectableConfig={{
                prefixed: false,
                selection:
                  allChildrenSelected || selectionsTree.isSelected(spec.unique),
                spec,
                containingSpecNodes: containingSpecNodes,
                gotoUnique,
                addSelection: () => _addSelection(spec),
                removeSelection: () => _removeSelection(spec)
              }}
            />
          </div>
        {/each}
      </div>
    </div>
  </ModalDialog>
{:catch err}
  {#if err.response}
    <Notice
      header="ERROR"
      alert="danger"
      message="Failed to load {typeLabel} '{parentUnique}':<br/>{errorReason(
        err.response
      )}"
      on:close={onClose}
    />
  {:else}
    {bubbleUpError(err)}
  {/if}
{/await}

<style lang="scss">
  @import '../variables.scss';

  :global(.tree-browser-content) {
    margin: 0 auto;
  }

  .ancestors-row {
    margin: 0;
  }

  .info-row {
    margin: 0;
    opacity: $deemphOpacity;
  }
</style>
