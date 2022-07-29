<script lang="ts">
  import type { SvelteComponent } from 'svelte';

  import ConfirmationRequest from '../../common/ConfirmationRequest.svelte';
  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import LocationLookup from './LocationLookup.svelte';
  import EmptyTab from '../../components/EmptyTab.svelte';
  import ExpandableSelectableTree from '../../components/ExpandableSelectableTree.svelte';
  import SelectableLocation from './SelectableLocation.svelte';
  import BrowseTreeDialog from '../../dialogs/BrowseTreeDialog.svelte';
  import TaxaForLocations from './TaxaForLocations.svelte';
  import { plusIcon, checkmarkIcon } from '../../components/SelectionButton.svelte';
  import { LocationSelectionsTree } from '../../../frontend-core/selections/location_selections_tree';
  import {
    type LocationSpec,
    createContainingLocationSpecs
  } from '../../../shared/model';
  import type {
    ExpandableNode,
    SpecNode
  } from '../../../frontend-core/selections/selections_tree';
  import { pageName } from '../../stores/pageName';
  import { selectedLocations } from '../../stores/selectedLocations';
  import { client } from '../../stores/client';
  import { type ModelSpec, ROOT_LOCATION_UNIQUE } from '../../../shared/model';
  import { noTypeCheck } from '../../util/svelte_types';
  import {
    type GeneralQuery,
    type QueryColumnSpec,
    type QueryRow,
    QueryColumnID
  } from '../../../shared/general_query';
  import { getLocationFilter } from '../../lib/query_filtering';

  $pageName = 'Selected Locations';
  const tabName = 'Locations';

  let browseLocationUnique: string | null = null;
  let rootTree: SvelteComponent;
  let rootNode: ExpandableNode<LocationSpec> | null = null;
  let containingSpecNodes: SpecNode<ModelSpec>[] = [];
  let requestClearConfirmation = false;
  let clearInput: () => void;
  let taxonRows: QueryRow[] = [];
  let increasingTaxonRows = false;
  let moreTaxaExist = false;

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
    _resetTaxa();
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

    const res = await $client.post('api/location/pull_children', {
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

  async function getTaxonRows(
    count: number,
    increasing: boolean
  ): Promise<[QueryRow[], boolean]> {
    const query = await _createTaxonQuery(increasing);
    if (taxonRows.length == 0 || increasing != increasingTaxonRows) {
      try {
        let res = await $client.post('api/specimen/query', {
          query,
          skip: 0,
          limit: count + 1
        });
        taxonRows = res.data.rows; // must indicate whether there are more rows
        moreTaxaExist = taxonRows.length > count;
      } catch (err: any) {
        taxonRows = [];
      }
    } else if (count < taxonRows.length) {
      // Don't change taxonRows, as that would create an infinite loop of updates.
      moreTaxaExist = true;
      return [taxonRows.slice(0, count), true];
    } else if (moreTaxaExist) {
      count -= taxonRows.length;
      try {
        let res = await $client.post('api/specimen/query', {
          query,
          skip: taxonRows.length - 1,
          limit: count + 1
        });
        const rows = res.data.rows;
        taxonRows.push(...rows); // must indicate whether there are more rows
        moreTaxaExist = rows.length > count;
      } catch (err: any) {
        taxonRows = [];
      }
    }
    increasingTaxonRows = increasing;
    return [taxonRows, moreTaxaExist];
  }

  async function loadSpec(unique: string): Promise<LocationSpec> {
    let res = await $client.post('api/location/pull_list', {
      locationUniques: [unique]
    });
    const specs: LocationSpec[] = res.data.locationSpecs;
    if (specs.length == 0) {
      throw Error(`Failed to load location '${unique}'`);
    }
    return specs[0];
  }

  async function addSelection(clear: boolean, spec: LocationSpec) {
    _resetTaxa();
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
    _resetTaxa();
    if (clear) clearInput();
    selectionsTree.removeSelection(containingLocations, spec);
    selectedLocations.set(selectionsTree.getSelectionSpecs());
  }

  async function _createTaxonQuery(increasing: boolean): Promise<GeneralQuery> {
    const columnSpecs: QueryColumnSpec[] = [];
    columnSpecs.push({
      columnID: QueryColumnID.RecordCount,
      ascending: increasing,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Class,
      ascending: true,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Order,
      ascending: true,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Family,
      ascending: true,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.TaxonUnique,
      ascending: true,
      optionText: null
    });

    return {
      columnSpecs,
      dateFilter: null,
      locationFilter: await getLocationFilter(),
      taxonFilter: null
    };
  }

  function _resetTaxa() {
    taxonRows = [];
    moreTaxaExist = false;
  }
</script>

<DataTabRoute activeTab={tabName}>
  <div class="container-fluid">
    <TabHeader {tabName} title={$pageName}>
      <span slot="instructions"
        >This tab shows the locations that you have selected for use in other tabs.
        Selections appear <b>checked {@html checkmarkIcon} and bolded</b>. Click on the {@html plusIcon}
        or {@html checkmarkIcon} to toggle selections. Click on a location link or on "Browse
        Locations" to browse, add, and remove locations. Type locations in the box for autocompletion
        assistance and fast selection.</span
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

    {#if !rootNode}
      <EmptyTab
        message="No locations selected<div class='no-selection-paren'>(equivalent to selecting all locations)</div>"
      />
    {:else}
      <div class="tree_area">
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
      </div>

      <hr />
      <TaxaForLocations {taxonRows} {getTaxonRows} increasing={increasingTaxonRows} />
    {/if}
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
    singularTypeLabel="location"
    pluralTypeLabel="locations"
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
