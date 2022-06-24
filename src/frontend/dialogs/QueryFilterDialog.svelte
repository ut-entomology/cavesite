<script lang="ts">
  import { dndzone, Item } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';

  import ModalDialog from '../common/ModalDialog.svelte';
  import CircleIconButton from '../components/CircleIconButton.svelte';
  import { LocationRank, TaxonRank } from '../../shared/model';
  import { columnInfoMap, type QueryColumnInfo } from '../lib/query_column_info';
  import type {
    QueryLocationFilter,
    QueryTaxonFilter,
    GeneralQuery
  } from '../../shared/user_query';
  import { selectedLocations } from '../stores/selectedLocations';
  import { selectedTaxa } from '../stores/selectedTaxa';

  type DraggableItem = Item & {
    info: QueryColumnInfo;
  };

  enum NullOption {
    AnyValue = 'any-value',
    NonNull = 'non-null',
    OnlyNull = 'null-only'
  }

  enum SortOption {
    Unsorted = 'unsorted',
    Ascending = 'ascending',
    Descending = 'descending'
  }

  const FLIP_DURATION_MILLIS = 200;
  const DRAG_ICON_TEXT = 'Click and drag to change the column sort order.';

  export let initialQuery: GeneralQuery;
  export let onClose: () => void;
  export let onQuery: (query: GeneralQuery) => void;

  let filterTaxa = initialQuery.taxonFilter !== null;
  let filterLocations = initialQuery.locationFilter !== null;
  let includedItems: DraggableItem[] = [];
  let excludedItems: DraggableItem[] = [];
  let nullSelections: NullOption[] = [];
  let sortSelections: SortOption[] = [];

  for (const columnSpec of initialQuery.columnSpecs) {
    const columnID = columnSpec.columnID;
    includedItems.push({ id: columnID, info: columnInfoMap[columnID] });
    nullSelections[columnID] = _toNullOption(columnSpec.nullValues);
    sortSelections[columnID] = _toSortOption(columnSpec.ascending);
  }
  for (const columnInfo of Object.values(columnInfoMap)) {
    const columnID = columnInfo.columnID;
    if (!initialQuery.columnSpecs.find((spec) => spec.columnID == columnID)) {
      excludedItems.push({ id: columnID, info: columnInfo });
      nullSelections[columnID] = NullOption.AnyValue; // default value
      sortSelections[columnID] = SortOption.Unsorted; // default value
    }
  }

  function getLocationFilter(): QueryLocationFilter | null {
    if ($selectedLocations === null) return null;

    const filter: QueryLocationFilter = {
      countyIDs: null,
      localityIDs: null
    };
    for (const spec of Object.values($selectedLocations)) {
      switch (spec.rank) {
        case LocationRank.County:
          filter.countyIDs = appendFilteredID(filter.countyIDs, spec.locationID);
          break;
        case LocationRank.Locality:
          filter.localityIDs = appendFilteredID(filter.localityIDs, spec.locationID);
          break;
      }
    }
    return filter;
  }

  function getTaxonFilter(): QueryTaxonFilter | null {
    if ($selectedTaxa === null) return null;

    const filter: QueryTaxonFilter = {
      phylumIDs: null,
      classIDs: null,
      orderIDs: null,
      familyIDs: null,
      genusIDs: null,
      speciesIDs: null,
      subspeciesIDs: null
    };
    for (const spec of Object.values($selectedTaxa)) {
      switch (spec.rank) {
        case TaxonRank.Phylum:
          filter.phylumIDs = appendFilteredID(filter.phylumIDs, spec.taxonID);
          break;
        case TaxonRank.Class:
          filter.classIDs = appendFilteredID(filter.classIDs, spec.taxonID);
          break;
        case TaxonRank.Order:
          filter.orderIDs = appendFilteredID(filter.orderIDs, spec.taxonID);
          break;
        case TaxonRank.Family:
          filter.familyIDs = appendFilteredID(filter.familyIDs, spec.taxonID);
          break;
        case TaxonRank.Genus:
          filter.genusIDs = appendFilteredID(filter.genusIDs, spec.taxonID);
          break;
        case TaxonRank.Species:
          filter.speciesIDs = appendFilteredID(filter.speciesIDs, spec.taxonID);
          break;
        case TaxonRank.Subspecies:
          filter.subspeciesIDs = appendFilteredID(filter.subspeciesIDs, spec.taxonID);
          break;
      }
    }
    return filter;
  }

  function appendFilteredID(toList: number[] | null, taxonID: number): number[] {
    if (toList === null) return [taxonID];
    toList.push(taxonID);
    return toList;
  }

  function resortIncludedItems(e: CustomEvent<DndEvent>) {
    includedItems = e.detail.items as DraggableItem[];
  }

  function resortExcludedItems(e: CustomEvent<DndEvent>) {
    excludedItems = e.detail.items as DraggableItem[];
  }

  const addQueryColumn = (item: DraggableItem) => {
    excludedItems.splice(excludedItems.indexOf(item), 1);
    includedItems.push(item);
    excludedItems = excludedItems; // tell Svelte to redraw
    includedItems = includedItems;
  };

  const removeQueryColumn = (item: DraggableItem) => {
    includedItems.splice(includedItems.indexOf(item), 1);
    excludedItems.push(item);
    excludedItems = excludedItems; // tell Svelte to redraw
    includedItems = includedItems;
  };

  const submitQuery = () => {
    onQuery({
      columnSpecs: includedItems.map((item) => {
        const columnID = item.info.columnID;

        const nullOption = nullSelections[columnID];
        let nullValues: boolean | null = null;
        if (nullOption != NullOption.AnyValue) {
          nullValues = nullOption == NullOption.OnlyNull;
        }

        const sortOption = sortSelections[columnID];
        let ascending: boolean | null = null;
        if (sortOption != SortOption.Unsorted) {
          ascending = sortOption == SortOption.Ascending;
        }

        return { columnID, nullValues, ascending };
      }),
      locationFilter: filterLocations ? getLocationFilter() : null,
      taxonFilter: filterTaxa ? getTaxonFilter() : null
    });
  };

  function _nullLabel(info: QueryColumnInfo, whenNull: boolean): string {
    if (Array.isArray(info.nullable)) {
      return info.nullable[whenNull ? 0 : 1];
    }
    return whenNull ? 'Blank' : 'Non-Blank';
  }

  function _toNullOption(nullValues: boolean | null) {
    if (nullValues === null) return NullOption.AnyValue;
    return nullValues ? NullOption.OnlyNull : NullOption.NonNull;
  }

  function _toSortOption(ascending: boolean | null) {
    if (ascending === null) return SortOption.Unsorted;
    return ascending ? SortOption.Ascending : SortOption.Descending;
  }
</script>

<ModalDialog
  title="New Query"
  contentClasses="query-filter-content"
  dialogClasses="query-filter-dialog"
>
  <div class="row mb-4">
    <div class="col">
      Drag and drop the values you want in the query results and order them, or click
      '&times;' and '&plus;'. Sorted values sort results in order of appearance.
    </div>
  </div>
  <div class="included_columns">
    <div class="drag_area_title">Included in Query</div>
    <div
      class="drag_area"
      use:dndzone={{
        items: includedItems,
        flipDurationMs: FLIP_DURATION_MILLIS,
        morphDisabled: true
      }}
      on:consider={resortIncludedItems}
      on:finalize={resortIncludedItems}
    >
      {#each includedItems as item (item.id)}
        <div
          class="column_spec row mb-1 gx-2"
          style="margin: 0"
          animate:flip={{ duration: FLIP_DURATION_MILLIS }}
        >
          <div class="col-auto">
            <img
              class="non_skid_icon"
              src="/non-skid-icon-3x3.png"
              title={DRAG_ICON_TEXT}
              alt={DRAG_ICON_TEXT}
            />
          </div>
          <div class="col" title={item.info.description}>
            {item.info.fullName}
          </div>
          {#if item.info.nullable}
            <div class="col-auto">
              <select
                bind:value={nullSelections[item.id]}
                class="form-select form-select-sm item_select"
                aria-label=".form-select-sm example"
              >
                <option value={NullOption.AnyValue}>Any value</option>
                <option value={NullOption.NonNull}
                  >{_nullLabel(item.info, false)}</option
                >
                <option value={NullOption.OnlyNull}
                  >{_nullLabel(item.info, true)}</option
                >
              </select>
            </div>
          {/if}
          <div class="col-auto">
            <select
              bind:value={sortSelections[item.id]}
              class="form-select form-select-sm item_select"
              aria-label=".form-select-sm example"
            >
              <option value={SortOption.Unsorted}>Unsorted</option>
              <option value={SortOption.Ascending}>Ascending</option>
              <option value={SortOption.Descending}>Descending</option>
            </select>
          </div>
          <div class="col-auto">
            <CircleIconButton
              class="column_toggle"
              on:click={() => removeQueryColumn(item)}
              label="Remove field from query"
            >
              <div>&times;</div>
            </CircleIconButton>
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="excluded_columns">
    <div class="drag_area_title">Excluded from Query</div>
    <div
      class="row drag_area"
      style="margin: 0"
      use:dndzone={{
        items: excludedItems,
        flipDurationMs: FLIP_DURATION_MILLIS,
        dropFromOthersDisabled: true
      }}
      on:consider={resortExcludedItems}
      on:finalize={resortExcludedItems}
    >
      {#each excludedItems as item (item.id)}
        <div
          class="col-md-6 column_spec mb-1 gx-2"
          style="margin: 0"
          animate:flip={{ duration: FLIP_DURATION_MILLIS }}
        >
          <div class="row mb-1 gx-2" style="margin: 0">
            <div class="col-auto">
              <img
                class="non_skid_icon"
                src="/non-skid-icon-3x3.png"
                title={DRAG_ICON_TEXT}
                alt={DRAG_ICON_TEXT}
              />
            </div>
            <div class="col" title={item.info.description}>
              {item.info.fullName}
            </div>
            <div class="col-auto">
              <CircleIconButton
                class="column_toggle"
                on:click={() => addQueryColumn(item)}
                label="Add field to query"
              >
                <div>&plus;</div>
              </CircleIconButton>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="row justify-content-center mt-3 mb-2">
    <div class="col-auto">
      Restrict results to selected:
      <span class="form-check form-check-inline ms-2">
        <input
          type="checkbox"
          bind:checked={filterTaxa}
          class="form-check-input"
          aria-label="filter by taxa"
        />
        <label class="form-check-label" for="taxonFilterSwitch">taxa</label>
      </span>
      <span class="form-check form-check-inline">
        <input
          type="checkbox"
          bind:checked={filterLocations}
          class="form-check-input"
          aria-label="filter by locations"
        />
        <label class="form-check-label" for="locationFilterSwitch">locations</label>
      </span>
    </div>
  </div>

  <div class="dialog_controls row g-2">
    <div class="col-12 text-center">
      <button class="btn btn-minor" type="button" on:click={onClose}>Cancel</button>
      <button class="btn btn-major" type="button" on:click={submitQuery}>Submit</button>
    </div>
  </div></ModalDialog
>

<style lang="scss">
  @import '../variables.scss';

  .included_columns,
  .excluded_columns {
    border-radius: $border-radius;
    border: 1px solid black;
    padding: 0 0.5em 0.5em 0.5em;
  }

  .excluded_columns {
    margin: 1.5rem 0 0.5rem 0;
  }

  .drag_area_title {
    font-weight: bold;
    width: fit-content;
    margin: -0.8em 0 0.5em 1em;
    padding: 0 0.5em;
    background-color: white;
  }

  .drag_area {
    min-height: 2rem;
  }

  .non_skid_icon {
    width: 1rem;
    height: 1rem;
    margin: -0.2rem 0 0 0;
    padding: 0;
    opacity: 0.4;
  }

  :global(.column_toggle) {
    margin-top: -0.1rem;
    font-size: 1.3rem;
    width: 1.3rem;
    height: 1.3rem;
  }

  :global(.column_toggle div) {
    margin-top: -0.45rem;
  }

  .column_spec:nth-child(even) {
    background-color: #eaeaea;
  }
  .column_spec:nth-child(odd) {
    background-color: #f4f4f4;
  }

  .item_select {
    width: fit-content;
    font-size: 0.8rem;
    margin-top: 0.075rem;
    padding: 0 2rem 0 0.5rem;
    background-position: right 0.5rem center;
  }

  .dialog_controls button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }
</style>
