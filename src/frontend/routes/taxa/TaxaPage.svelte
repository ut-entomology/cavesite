<script lang="ts">
  // TODO: Revisit robustness of caching taxa and location IDs on the client,
  // given that these IDs change with each import from GBIF.

  import type { SvelteComponent } from 'svelte';

  import ConfirmationRequest from '../../common/ConfirmationRequest.svelte';
  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import TaxonLookup from './TaxonLookup.svelte';
  import EmptyTab from '../../components/EmptyTab.svelte';
  import ExpandableSelectableTree from '../../components/ExpandableSelectableTree.svelte';
  import SelectableTaxon from './SelectableTaxon.svelte';
  import BrowseTreeDialog from '../../dialogs/BrowseTreeDialog.svelte';
  import LocalitiesForTaxa from './LocalitiesForTaxa.svelte';
  import TaxaHowTo from './TaxaHowTo.svelte';
  import { plusIcon, checkmarkIcon } from '../../components/SelectionButton.svelte';
  import { TaxonSelectionsTree } from '../../../frontend-core/selections/taxon_selections_tree';
  import { type TaxonSpec, createContainingTaxonSpecs } from '../../../shared/model';
  import type {
    ExpandableNode,
    SpecNode
  } from '../../../frontend-core/selections/selections_tree';
  import { pageName } from '../../stores/pageName';
  import { selectedTaxa } from '../../stores/selectedTaxa';
  import { client } from '../../stores/client';
  import { ROOT_TAXON_UNIQUE } from '../../../shared/model';
  import { noTypeCheck } from '../../util/svelte_types';
  import {
    type GeneralQuery,
    type QueryColumnSpec,
    type QueryRow,
    QueryColumnID
  } from '../../../shared/general_query';
  import { getTaxonFilter } from '../../lib/query_filtering';

  $pageName = 'Selected Taxa';
  const tabName = 'Taxa';

  let browseTaxonUnique: string | null = null;
  let rootTree: SvelteComponent;
  let rootNode: ExpandableNode<TaxonSpec> | null = null;
  let requestClearConfirmation = false;
  let clearInput: () => void;
  let locationRows: QueryRow[] = [];
  let increasingLocationRows = false;
  let moreLocationsExist = false;

  const selectionsTree = new TaxonSelectionsTree(
    $selectedTaxa ? Object.values($selectedTaxa) : []
  );
  $: $selectedTaxa, (rootNode = selectionsTree.getRootNode());

  const expandTree = () => rootTree.expandAll();

  const clearSelections = () => (requestClearConfirmation = true);

  const openTaxonBrowser = (taxonUnique: string) => {
    browseTaxonUnique = taxonUnique;
  };

  const confirmClear = () => {
    requestClearConfirmation = false;
    if (rootNode) {
      selectionsTree.removeSelection([], rootNode.spec);
      selectedTaxa.set(selectionsTree.getSelectionSpecs());
    }
    _resetLocations();
    clearInput();
  };

  const cancelClear = () => (requestClearConfirmation = false);

  async function getContainingTaxa(ofTaxonSpec: TaxonSpec, includeGivenTaxon: boolean) {
    // Create specs for the taxa that contain ofTaxonSpec.

    const containingSpecs = createContainingTaxonSpecs(ofTaxonSpec);
    if (includeGivenTaxon) {
      containingSpecs.push(ofTaxonSpec);
    }

    // Load specs for the children of the containing taxa.

    const res = await $client.post('api/taxa/pull_children', {
      parentUniques: containingSpecs.map((spec) => spec.unique)
    });
    const ancestorChildSpecs: TaxonSpec[][] = res.data.taxonSpecs;
    const containingTaxa: SpecNode<TaxonSpec>[] = [];
    for (const containingSpec of containingSpecs) {
      containingTaxa.push({
        spec: containingSpec,
        children: ancestorChildSpecs.shift()!
      });
    }
    return containingTaxa;
  }

  async function getLocationRows(
    count: number,
    increasing: boolean
  ): Promise<[QueryRow[], boolean]> {
    const query = await _createLocationQuery(increasing);
    if (locationRows.length == 0 || increasing != increasingLocationRows) {
      try {
        let res = await $client.post('api/specimen/query', {
          query,
          skip: 0,
          limit: count + 1
        });
        locationRows = res.data.rows; // must indicate whether there are more rows
        moreLocationsExist = locationRows.length > count;
      } catch (err: any) {
        locationRows = [];
      }
    } else if (count < locationRows.length) {
      // Don't change locationRows, as that would create an infinite loop of updates.
      moreLocationsExist = true;
      return [locationRows.slice(0, count), true];
    } else if (moreLocationsExist) {
      count -= locationRows.length;
      try {
        let res = await $client.post('api/specimen/query', {
          query,
          skip: locationRows.length - 1,
          limit: count + 1
        });
        const rows = res.data.rows;
        locationRows.push(...rows); // must indicate whether there are more rows
        moreLocationsExist = rows.length > count;
      } catch (err: any) {
        locationRows = [];
      }
    }
    increasingLocationRows = increasing;
    return [locationRows, moreLocationsExist];
  }

  async function loadSpec(unique: string): Promise<TaxonSpec> {
    let res = await $client.post('api/taxa/pull_list', {
      taxonUniques: [unique]
    });
    const specs: TaxonSpec[] = res.data.taxonSpecs;
    if (specs.length == 0) {
      throw Error(`Failed to load taxon '${unique}'`);
    }
    return specs[0];
  }

  async function addSelection(clear: boolean, spec: TaxonSpec) {
    if (spec.taxonID == 0) {
      spec = await loadSpec(spec.unique);
    }
    _resetLocations();
    selectionsTree.addSelection(spec);
    selectedTaxa.set(selectionsTree.getSelectionSpecs());
    if (clear) clearInput();
  }

  function removeSelection(
    clear: boolean,
    containingTaxa: SpecNode<TaxonSpec>[],
    spec: TaxonSpec
  ) {
    _resetLocations();
    if (clear) clearInput();
    selectionsTree.removeSelection(containingTaxa, spec);
    selectedTaxa.set(selectionsTree.getSelectionSpecs());
  }

  async function _createLocationQuery(increasing: boolean): Promise<GeneralQuery> {
    const columnSpecs: QueryColumnSpec[] = [];
    columnSpecs.push({
      columnID: QueryColumnID.RecordCount,
      ascending: increasing,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Locality,
      ascending: true,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.County,
      ascending: true,
      optionText: null
    });

    return {
      columnSpecs,
      dateFilter: null,
      locationFilter: null,
      taxonFilter: await getTaxonFilter()
    };
  }

  function _resetLocations() {
    locationRows = [];
    moreLocationsExist = false;
  }
</script>

<DataTabRoute activeTab={tabName} embedHowTo={!rootNode}>
  <svelte:fragment slot="how-to"><TaxaHowTo /></svelte:fragment>
  <svelte:fragment slot="body">
    <div class="container-fluid mb-3">
      <TabHeader {tabName} title={$pageName}>
        <span slot="instructions"
          >This tab shows the taxa that you have selected for use in other tabs.
          Selections appear <b>checked {@html checkmarkIcon} and bolded</b>. Click on
          the {@html plusIcon}
          or {@html checkmarkIcon} to toggle selections. Click on a taxon link or on "Browse
          Taxa" to browse, add, and remove taxa. Type taxa in the box for autocompletion
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
            on:click={() => openTaxonBrowser(ROOT_TAXON_UNIQUE)}>Browse Taxa</button
          >
        </span>
        <div slot="how-to"><TaxaHowTo /></div>
      </TabHeader>

      <div class="taxon_lookup container-fluid">
        <TaxonLookup
          {selectionsTree}
          {getContainingTaxa}
          addSelection={addSelection.bind(null, false)}
          removeSelection={removeSelection.bind(null, false)}
          openUnique={async (unique) => openTaxonBrowser(unique)}
          setClearer={(clearer) => (clearInput = clearer)}
        />
      </div>

      {#if !rootNode}
        <EmptyTab message="No taxa selected" />
      {:else}
        <div class="tree_area">
          <div class="container-fluid gx-1">
            <ExpandableSelectableTree
              bind:this={rootTree}
              node={rootNode}
              showRoot={false}
              let:selectableConfig
            >
              <SelectableTaxon
                {...selectableConfig}
                gotoUnique={async (unique) => openTaxonBrowser(unique)}
                addSelection={addSelection.bind(null, true)}
                removeSelection={removeSelection.bind(null, true)}
              />
            </ExpandableSelectableTree>
          </div>
        </div>

        <hr />
        <LocalitiesForTaxa
          {locationRows}
          {getLocationRows}
          increasing={increasingLocationRows}
        />
      {/if}
    </div>
  </svelte:fragment>
</DataTabRoute>

{#if requestClearConfirmation}
  <ConfirmationRequest
    alert="warning"
    message="Clear these taxa selections?"
    okayButton="Clear"
    onOkay={confirmClear}
    onCancel={cancelClear}
  />
{/if}

{#if browseTaxonUnique !== null}
  <BrowseTreeDialog
    title="Browse and Select Taxa"
    singularTypeLabel="taxon"
    pluralTypeLabel="taxa"
    rootUnique={ROOT_TAXON_UNIQUE}
    parentUnique={browseTaxonUnique}
    selectedSpecsStore={selectedTaxa}
    {selectionsTree}
    {loadSpec}
    getContainingSpecNodes={noTypeCheck(getContainingTaxa)}
    addSelection={addSelection.bind(null, true)}
    removeSelection={removeSelection.bind(null, true)}
    onClose={() => {
      browseTaxonUnique = null;
    }}
    let:selectableConfig
  >
    <SelectableTaxon {...selectableConfig} />
  </BrowseTreeDialog>
{/if}

<style>
  .taxon_lookup {
    margin: 0.5rem auto 1rem auto;
    max-width: 30rem;
  }

  .tree_area {
    margin-bottom: 1.5rem;
  }

  .tree_area :global(.taxon_selector) {
    margin-right: 0;
  }
</style>
