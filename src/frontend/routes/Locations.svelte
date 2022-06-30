<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  import ConfirmationRequest from '../common/ConfirmationRequest.svelte';
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import LocationLookup from '../components/LocationLookup.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import ExpandableSelectableTree from '../components/ExpandableSelectableTree.svelte';
  import SelectableLocation from '../components/SelectableLocation.svelte';
  import { plusIcon, checkmarkIcon } from '../components/SelectionButton.svelte';
  import BrowseTreeDialog from '../dialogs/BrowseTreeDialog.svelte';
  import { LocationSelectionsTree } from '../../frontend-core/location_selections_tree';
  import { type LocationSpec, createContainingLocationSpecs } from '../../shared/model';
  import type { ExpandableNode, SpecNode } from '../../frontend-core/selections_tree';
  import { pageName } from '../stores/pageName';
  import { selectedLocations } from '../stores/selectedLocations';
  import { client } from '../stores/client';
  import { type ModelSpec, ROOT_LOCATION_UNIQUE } from '../../shared/model';
  import { noTypeCheck } from '../util/svelte_types';

  $pageName = 'Selected Locations';

  let browseLocationUnique: string | null = null;
  let rootTree: SvelteComponent;
  let rootNode: ExpandableNode<LocationSpec> | null = null;
  let containingSpecNodes: SpecNode<ModelSpec>[] = [];
  let requestClearConfirmation = false;
  let clearInput: () => void;

  const selectionsTree = new LocationSelectionsTree(
    $selectedLocations ? Object.values($selectedLocations) : []
  );
  $: $selectedLocations,
    (() => {
      rootNode = selectionsTree.getRootNode();
      if (rootNode) {
        containingSpecNodes = [];
        let priorSpecNode: SpecNode<ModelSpec> = { spec: rootNode.spec, children: [] };
        while (rootNode && rootNode.spec.unique != ROOT_LOCATION_UNIQUE) {
          containingSpecNodes.push(priorSpecNode);
          rootNode = rootNode.children[0];
          priorSpecNode.children.push(rootNode.spec);
          priorSpecNode = { spec: rootNode.spec, children: [] };
        }
      }
    })();

  const expandTree = () => rootTree.expandAll();

  const clearSelections = () => (requestClearConfirmation = true);

  const openLocationBrowser = (unique: string) => {
    browseLocationUnique = unique;
  };

  const confirmClear = () => {
    requestClearConfirmation = false;
    if (rootNode) {
      selectionsTree.removeSelection([], rootNode.spec);
      selectedLocations.set(selectionsTree.getSelectionSpecs());
    }
    clearInput();
  };

  const cancelClear = () => (requestClearConfirmation = false);

  async function getContainingLocations(
    ofLocationSpec: LocationSpec,
    includeGivenLocation: boolean
  ) {
    // Create specs for the locations that contain ofLocationSpec.

    const containingSpecs = createContainingLocationSpecs(ofLocationSpec);
    if (includeGivenLocation) {
      containingSpecs.push(ofLocationSpec);
    }

    // Load specs for the children of the containing locations.

    const res = await $client.post('api/location/get_children', {
      parentUniques: containingSpecs.map((spec) => spec.unique)
    });
    const ancestorChildSpecs: LocationSpec[][] = res.data.locationSpecs;
    const containingLocations: SpecNode<LocationSpec>[] = [];
    for (const containingSpec of containingSpecs) {
      containingLocations.push({
        spec: containingSpec,
        children: ancestorChildSpecs.shift()!
      });
    }
    return containingLocations;
  }

  async function loadSpec(unique: string): Promise<LocationSpec> {
    let res = await $client.post('api/location/get_list', {
      locationUniques: [unique]
    });
    const specs: LocationSpec[] = res.data.locationSpecs;
    if (specs.length == 0) {
      throw Error(`Failed to load location '${unique}'`);
    }
    return specs[0];
  }

  async function addSelection(clear: boolean, spec: LocationSpec) {
    if (spec.locationID == 0) {
      spec = await loadSpec(spec.unique);
    }
    selectionsTree.addSelection(spec);
    selectedLocations.set(selectionsTree.getSelectionSpecs());
    if (clear) clearInput();
  }

  function removeSelection(
    clear: boolean,
    containingLocations: SpecNode<LocationSpec>[],
    spec: LocationSpec
  ) {
    if (clear) clearInput();
    selectionsTree.removeSelection(containingLocations, spec);
    selectedLocations.set(selectionsTree.getSelectionSpecs());
  }
</script>

<DataTabRoute activeTab="Locations">
  <div class="container-fluid">
    <TabHeader
      title={$pageName}
      instructions="This tab shows the locations that you have selected for use in other tabs. Selections appear <b>checked {checkmarkIcon} and bolded</b>. Click on the {plusIcon} or {checkmarkIcon} to toggle selections. Click on a location link or on [Browse Locations] to browse, add, and remove locations. Type locations in the box for autocompletion assistance and fast selection."
    >
      <span slot="main-buttons">
        {#if rootNode}
          <button class="btn btn-minor" type="button" on:click={expandTree}
            >Expand All</button
          >
          <button class="btn btn-minor" type="button" on:click={clearSelections}
            >Clear</button
          >
        {/if}
        <button
          class="btn btn-major"
          type="button"
          on:click={() => openLocationBrowser(ROOT_LOCATION_UNIQUE)}
          >Browse Locations</button
        >
      </span>
    </TabHeader>

    <div class="location_lookup container-fluid">
      <LocationLookup
        {selectionsTree}
        {getContainingLocations}
        addSelection={addSelection.bind(null, false)}
        removeSelection={removeSelection.bind(null, false)}
        openUnique={async (unique) => openLocationBrowser(unique)}
        setClearer={(clearer) => (clearInput = clearer)}
      />
    </div>

    <div class="tree_area">
      {#if !rootNode}
        <EmptyTab
          message="No locations selected<div class='no-selection-paren'>(equivalent to selecting all locations)</div>"
        />
      {:else}
        <div class="container-fluid gx-1">
          <ExpandableSelectableTree
            bind:this={rootTree}
            node={rootNode}
            {containingSpecNodes}
            showRoot={false}
            let:selectableConfig
          >
            <SelectableLocation
              {...selectableConfig}
              gotoUnique={async (unique) => openLocationBrowser(unique)}
              addSelection={addSelection.bind(null, true)}
              removeSelection={removeSelection.bind(null, true)}
            />
          </ExpandableSelectableTree>
        </div>
      {/if}
    </div>
  </div>
</DataTabRoute>

{#if requestClearConfirmation}
  <ConfirmationRequest
    alert="warning"
    message="Clear these location selections?"
    okayButton="Clear"
    onOkay={confirmClear}
    onCancel={cancelClear}
  />
{/if}

{#if browseLocationUnique !== null}
  <BrowseTreeDialog
    title="Browse and Select Locations"
    typeLabel="location"
    rootUnique={ROOT_LOCATION_UNIQUE}
    parentUnique={browseLocationUnique}
    selectedSpecsStore={selectedLocations}
    {selectionsTree}
    {loadSpec}
    getContainingSpecNodes={noTypeCheck(getContainingLocations)}
    addSelection={addSelection.bind(null, true)}
    removeSelection={removeSelection.bind(null, true)}
    onClose={() => {
      browseLocationUnique = null;
    }}
    let:selectableConfig
  >
    <SelectableLocation {...selectableConfig} />
  </BrowseTreeDialog>
{/if}

<style>
  .location_lookup {
    margin: 0.5rem auto 1rem auto;
    max-width: 30rem;
  }

  :global(.tree_area) {
    margin-bottom: 1.5rem;
  }

  :global(.tree_area .location_selector) {
    margin-right: 0;
  }
</style>
