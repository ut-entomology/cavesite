<script lang="ts">
  import ModalDialog from '../common/ModalDialog.svelte';
  import Notice from '../common/Notice.svelte';
  import { checkmarkIcon, plusIcon } from '../components/SelectionButton.svelte';
  import { errorReason, bubbleUpError } from '../stores/client';
  import type { SelectedSpecsStore } from '../stores/selectedSpecs';
  import type { ModelSpec } from '../../shared/model';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection
  } from '../../frontend-core/selections/selections_tree';
  import type { SelectionsTree } from '../../frontend-core/selections/selections_tree';

  export let title: string;
  export let singularTypeLabel: string;
  export let pluralTypeLabel: string;
  export let rootUnique: string;
  export let parentUnique: string;
  export let selectionsTree: SelectionsTree<ModelSpec>;
  export let selectedSpecsStore: SelectedSpecsStore;
  export let loadSpec: (unique: string) => Promise<ModelSpec>;
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
  let visibleContainingSpecNodes: SpecNode<ModelSpec>[] = [];
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

    // Load the parent spec node and all its ancestor spec nodes, even if those
    // ancestors are already cached, mainly to keep the code simpler than it
    // would otherwise be. API calls are necessary, regardless.

    parentSpec = await loadSpec(parentUnique);
    containingSpecNodes = await getContainingSpecNodes(parentSpec, true);

    visibleContainingSpecNodes = [];
    let foundRoot = false;
    for (const containingSpecNode of containingSpecNodes) {
      if (containingSpecNode.spec.unique == rootUnique) foundRoot = true;
      if (foundRoot) visibleContainingSpecNodes.push(containingSpecNode);
    }

    childSpecs = containingSpecNodes[containingSpecNodes.length - 1].children;

    // Determine which ancestor spec nodes have been selected, if any.

    _determineAncestorSelections();
  }

  const gotoUnique = async (scrollToModalTop: () => void, unique: string) => {
    parentUnique = unique;
    await prepare();
    scrollToModalTop();
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

  async function _addSelection(spec: ModelSpec) {
    await addSelection(spec); // async version of AddSelection
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
    visibleContainingSpecNodes = visibleContainingSpecNodes; // redraw ancestors
  }
</script>

{#await prepare() then}
  <ModalDialog {title} contentClasses="tree-browser-content" let:scrollToModalTop>
    <div class="row info-row">
      <div class="col-auto mb-3 small">
        This box only shows {pluralTypeLabel} having records. Click on {singularTypeLabel}
        links to navigate around. A plus ({@html plusIcon}) indicates a {singularTypeLabel}
        that can be selected. A check ({@html checkmarkIcon}) indicates a {singularTypeLabel}
        that has been selected. Click
        {@html plusIcon} or {@html checkmarkIcon} to toggle selections.
      </div>
    </div>
    <div class="container-md">
      <div class="row gx-2 ancestors-row">
        <div class="col">
          {#each visibleContainingSpecNodes as containingSpecNode, i}
            {@const spec = containingSpecNode.spec}
            {@const selectableConfig = {
              // svelte crashes with "TypeError: Cannot read properties of null
              //  (reading 'type')" if I use "{{...}}" notation.
              prefixed: false,
              selection: selectedAncestorUniques[spec.unique],
              spec,
              containingSpecNodes: containingSpecNodes.slice(0, i),
              clickable: !!spec.hasChildren && spec.unique != parentUnique,
              gotoUnique: gotoUnique.bind(null, scrollToModalTop),
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
                gotoUnique: gotoUnique.bind(null, scrollToModalTop),
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
      message="Failed to load {singularTypeLabel} '{parentUnique}':<br/>{errorReason(
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
