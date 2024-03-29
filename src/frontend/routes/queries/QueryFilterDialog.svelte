<script lang="ts" context="module">
  import {
    EARLIEST_RECORD_DATE,
    type QueryDateFilter,
    type GeneralQuery
  } from '../../../shared/general_query';

  export function getDefaultDateRange(): [Date, Date] {
    return [EARLIEST_RECORD_DATE, new Date()];
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { dndzone, Item } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';

  import ModalDialog from '../../common/ModalDialog.svelte';
  import DateRangeInput from '../../components/DateRangeInput.svelte';
  import FilterSelector from '../../components/FilterSelector.svelte';
  import { columnInfoMap, type QueryColumnInfo } from '../../../shared/general_query';
  import { getLocationFilter, getTaxonFilter } from '../../lib/query_filtering';

  type DraggableItem = Item & {
    info: QueryColumnInfo;
  };

  enum SortOption {
    Unsorted = 'unsorted',
    Ascending = 'ascending',
    Descending = 'descending'
  }

  const FLIP_DURATION_MILLIS = 200;
  const DRAG_ICON_TEXT = 'Click and drag to change the column sort order.';
  const MAX_SINGLE_COL_EXCLUDED_WIDTH = 575;

  export let initialQuery: GeneralQuery;
  export let onClose: () => void;
  export let onQuery: (query: GeneralQuery) => void;

  const defaultDateRange = getDefaultDateRange();
  let filterByDate = initialQuery.dateFilter !== null;
  let fromDate = initialQuery.dateFilter
    ? new Date(initialQuery.dateFilter.fromDateMillis!)
    : defaultDateRange[0];
  let throughDate = initialQuery.dateFilter
    ? new Date(initialQuery.dateFilter.throughDateMillis!)
    : defaultDateRange[1];
  let filterTaxa = initialQuery.taxonFilter !== null;
  let filterLocations = initialQuery.locationFilter !== null;
  let includedItems: DraggableItem[] = [];
  let excludedItems: DraggableItem[] = [];
  let chosenOptions: (string | null)[] = [];
  let sortSelections: SortOption[] = [];
  let doubleColumnExcluded: boolean;

  onMount(() => {
    window.addEventListener('resize', () => {
      const nextDoubleColumnExcluded =
        window.innerWidth > MAX_SINGLE_COL_EXCLUDED_WIDTH;
      if (nextDoubleColumnExcluded != doubleColumnExcluded) {
        doubleColumnExcluded = nextDoubleColumnExcluded;
        _sortExcludedColumns();
      }
    });
    doubleColumnExcluded = window.innerWidth > MAX_SINGLE_COL_EXCLUDED_WIDTH;
    _sortExcludedColumns();
  });

  // Load previous query selections.
  for (const columnSpec of initialQuery.columnSpecs) {
    const columnID = columnSpec.columnID;
    includedItems.push({ id: columnID, info: columnInfoMap[columnID] });
    chosenOptions[columnID] = columnSpec.optionText;
    sortSelections[columnID] = _toSortOption(columnSpec.ascending);
  }
  // Provide defaults for any remaining query columns.
  for (const columnInfo of Object.values(columnInfoMap)) {
    const columnID = columnInfo.columnID;
    if (!initialQuery.columnSpecs.find((spec) => spec.columnID == columnID)) {
      excludedItems.push({ id: columnID, info: columnInfo });
      chosenOptions[columnID] = columnInfo.options ? columnInfo.options[0].text : null;
      sortSelections[columnID] = SortOption.Unsorted;
    }
  }

  function getDateFilter(): QueryDateFilter | null {
    if (!filterByDate) return null;
    return {
      fromDateMillis: fromDate.getTime(),
      throughDateMillis: throughDate.getTime()
    };
  }

  function resortIncludedItems(e: CustomEvent<DndEvent>) {
    includedItems = e.detail.items as DraggableItem[];
  }

  function resortExcludedItems(e: CustomEvent<DndEvent>) {
    excludedItems = e.detail.items as DraggableItem[];
    _sortExcludedColumns();
  }

  const addQueryColumn = (item: DraggableItem) => {
    excludedItems.splice(excludedItems.indexOf(item), 1);
    _sortExcludedColumns();
    includedItems.push(item);
    includedItems = includedItems;
  };

  const removeQueryColumn = (item: DraggableItem) => {
    includedItems.splice(includedItems.indexOf(item), 1);
    excludedItems.push(item);
    _sortExcludedColumns();
    includedItems = includedItems;
  };

  function setFilters(taxa: boolean, locations: boolean): string {
    filterTaxa = taxa;
    filterLocations = locations;

    return `querying ${taxa ? 'selected' : 'all'} taxa and ${
      locations ? 'selected' : 'all'
    } locations`;
  }

  async function submitQuery() {
    onQuery({
      columnSpecs: includedItems.map((item) => {
        const columnID = item.info.columnID;

        const optionText = chosenOptions[columnID] || null;

        const sortOption = sortSelections[columnID];
        let ascending: boolean | null = null;
        if (sortOption != SortOption.Unsorted) {
          ascending = sortOption == SortOption.Ascending;
        }

        return { columnID, optionText, ascending };
      }),
      dateFilter: getDateFilter(),
      locationFilter: filterLocations ? await getLocationFilter() : null,
      taxonFilter: filterTaxa ? await getTaxonFilter() : null
    });
  }

  function _setDateRange(from: Date, thru: Date, selected: boolean): void {
    if (selected) {
      filterByDate = true;
      fromDate = from;
      throughDate = thru;
    } else {
      filterByDate = false;
    }
  }

  function _sortExcludedColumns(): void {
    excludedItems.sort((a, b) => (a.info.fullName < b.info.fullName ? -1 : 1));
    if (doubleColumnExcluded) {
      const doubleColumnItems: DraggableItem[] = [];
      const halfExcludedItems = Math.ceil(excludedItems.length / 2);
      for (let i = 0; i < halfExcludedItems; i += 1) {
        doubleColumnItems.push(excludedItems[i]);
        if (i + halfExcludedItems < excludedItems.length) {
          doubleColumnItems.push(excludedItems[i + halfExcludedItems]);
        }
      }
      excludedItems = doubleColumnItems;
    } else {
      excludedItems = excludedItems; // update rendering
    }
  }

  function _toSortOption(ascending: boolean | null) {
    if (ascending === null) return SortOption.Unsorted;
    return ascending ? SortOption.Ascending : SortOption.Descending;
  }
</script>

<ModalDialog title="New Query" contentClasses="query-filter-content">
  <div class="row mb-3">
    <div class="col">
      Drag and drop the values you want in the query results and order them, or click
      '&times;' and '&plus;'. Sorted values sort results in their order here.
    </div>
  </div>
  <DateRangeInput
    classes="justify-content-center mb-3"
    selectable={true}
    selected={filterByDate}
    from={fromDate}
    through={throughDate}
    earliestDate={EARLIEST_RECORD_DATE}
    setDateRange={_setDateRange}
  />

  <FilterSelector classes="mb-4" {filterTaxa} {filterLocations} {setFilters} />

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
          class="column_spec row mb-1 gx-2 included"
          style="margin: 0"
          animate:flip={{ duration: FLIP_DURATION_MILLIS }}
        >
          <div class="col-auto">
            <img
              class="non_skid_icon"
              src="/static/non-skid-icon-3x3.png"
              title={DRAG_ICON_TEXT}
              alt={DRAG_ICON_TEXT}
            />
          </div>
          <div class="col" title={item.info.description}>
            {item.info.fullName}
          </div>
          {#if item.info.options}
            <div class="col-auto">
              <select
                bind:value={chosenOptions[item.id]}
                class="form-select form-select-sm item_select"
                aria-label=".form-select-sm example"
              >
                {#each item.info.options as option}
                  <option value={option.text}>{option.text}</option>
                {/each}
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
            <div
              class="column_toggle"
              on:click={() => removeQueryColumn(item)}
              label="Remove field from query"
            >
              <div>&times;</div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="excluded_columns">
    <div class="drag_area_title">Excluded from Query</div>
    <div
      class="row drag_area gx-2"
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
          class="col-sm-6 mb-1 gx-2 excluded"
          animate:flip={{ duration: FLIP_DURATION_MILLIS }}
        >
          <div class="row column_spec gx-2" style="margin: 0">
            <div class="col-auto">
              <img
                class="non_skid_icon"
                src="/static/non-skid-icon-3x3.png"
                title={DRAG_ICON_TEXT}
                alt={DRAG_ICON_TEXT}
              />
            </div>
            <div class="col" title={item.info.description}>
              {item.info.fullName}
            </div>
            <div class="col-auto">
              <div
                class="column_toggle"
                on:click={() => addQueryColumn(item)}
                label="Add field to query"
              >
                <div>&plus;</div>
              </div>
            </div>
          </div>
        </div>
      {/each}
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
  @import '../../variables.scss';

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

  .column_toggle {
    margin-top: -0.3rem;
    font-size: 1.3rem;
    width: 1rem;
    height: 1rem;
    cursor: pointer;
  }

  .column_toggle div {
    color: $blueLinkBackColor;
    text-align: center;
  }

  .column_spec.included:nth-child(even),
  .excluded:nth-child(even) .column_spec {
    background-color: #eaeaea;
  }
  .column_spec.included:nth-child(odd),
  .excluded:nth-child(odd) .column_spec {
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
