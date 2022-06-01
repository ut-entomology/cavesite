<script lang="ts">
  import { dndzone, Item } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';

  import ModalDialog from '../common/ModalDialog.svelte';
  import { TaxonRank } from '../../shared/model';
  import { columnInfoMap, type QueryColumnInfo } from '../lib/query_column_info';
  import {
    QueryColumnID,
    QueryColumnSpec,
    QueryTaxonFilter,
    type GeneralQuery
  } from '../../shared/user_query';
  import { selectedTaxa } from '../stores/selectedTaxa';

  type DraggableItem = Item & {
    info: QueryColumnInfo;
  };

  const FLIP_DURATION_MILLIS = 200;
  const DRAG_ICON_TEXT = 'Click and drag to change the column sort order.';
  export let onClose: () => void;
  export let onQuery: (query: GeneralQuery) => void;

  let filterForTaxa = false;
  let includedItems: DraggableItem[] = [];
  let excludedItems: DraggableItem[] = [];
  let columnSpecs: QueryColumnSpec[] = [];

  for (let i = 0; i < QueryColumnID._LENGTH; ++i) {
    const columnInfo = columnInfoMap[i];
    includedItems.push({ id: columnInfo.columnID, info: columnInfo });
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
          filter.phylumIDs = appendTaxonID(filter.phylumIDs, spec.taxonID);
          break;
        case TaxonRank.Class:
          filter.classIDs = appendTaxonID(filter.classIDs, spec.taxonID);
          break;
        case TaxonRank.Order:
          filter.orderIDs = appendTaxonID(filter.orderIDs, spec.taxonID);
          break;
        case TaxonRank.Family:
          filter.familyIDs = appendTaxonID(filter.familyIDs, spec.taxonID);
          break;
        case TaxonRank.Genus:
          filter.genusIDs = appendTaxonID(filter.genusIDs, spec.taxonID);
          break;
        case TaxonRank.Species:
          filter.speciesIDs = appendTaxonID(filter.speciesIDs, spec.taxonID);
          break;
        case TaxonRank.Subspecies:
          filter.subspeciesIDs = appendTaxonID(filter.subspeciesIDs, spec.taxonID);
          break;
      }
    }
    return filter;
  }

  function appendTaxonID(toList: number[] | null, taxonID: number): number[] {
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

  const submitQuery = () => {
    onQuery({
      columnSpecs,
      taxonFilter: filterForTaxa ? getTaxonFilter() : null
    });
  };
</script>

<ModalDialog
  title="New Query"
  contentClasses="query-filter-content"
  dialogClasses="query-filter-dialog"
>
  <div class="row justify-content-center mb-3">
    <div class="col-auto">
      <div class="form-check form-switch">
        <input
          type="checkbox"
          bind:checked={filterForTaxa}
          class="form-check-input"
          id="taxonFilterSwitch"
        />
        <label class="form-check-label" for="taxonFilterSwitch"
          >Filter for selected taxa</label
        >
      </div>
    </div>
  </div>

  <div class="included_columns">
    <div class="drag_area_title">Included in Query</div>
    <div
      class="drag_area"
      use:dndzone={{ items: includedItems, flipDurationMs: FLIP_DURATION_MILLIS }}
      on:consider={resortIncludedItems}
      on:finalize={resortIncludedItems}
    >
      {#each includedItems as item (item.id)}
        <div
          class="column-spec row mb-1 gx-2"
          style="margin: 0"
          animate:flip={{ duration: FLIP_DURATION_MILLIS }}
        >
          <div class="col-auto">
            <img
              class="non_skid_icon"
              src="/non-skid-icon.png"
              title={DRAG_ICON_TEXT}
              alt={DRAG_ICON_TEXT}
            />
          </div>
          <div class="col" title={item.info.description}>
            {item.info.fullName}
          </div>
          <div class="col-auto">
            <select
              class="form-select form-select-sm"
              aria-label=".form-select-sm example"
            >
              <option value="empty_or_not" selected>Empty or not</option>
              <option value="non_empty">Non-empty</option>
              <option value="empty_only">Empty only</option>
            </select>
          </div>
          <div class="col-auto">
            <select
              class="form-select form-select-sm"
              aria-label=".form-select-sm example"
            >
              <option value="unsorted" selected>Unsorted</option>
              <option value="ascending">Ascending</option>
              <option value="descending">Descending</option>
            </select>
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="excluded_columns">
    <div class="drag_area_title">Excluded from Query</div>
    <div
      class="drag_area"
      use:dndzone={{ items: excludedItems, flipDurationMs: FLIP_DURATION_MILLIS }}
      on:consider={resortExcludedItems}
      on:finalize={resortExcludedItems}
    >
      {#each excludedItems as item (item.id)}
        <div
          class="column-spec row mb-1"
          animate:flip={{ duration: FLIP_DURATION_MILLIS }}
        >
          <div class="col-auto">x</div>
          <div class="col" title={item.info.description}>
            {item.info.fullName}
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

  .drag_area select {
    width: fit-content;
    font-size: 0.8rem;
    padding: 0 2rem 0 0.5rem;
    background-position: right 0.5rem center;
  }

  .dialog_controls button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }
</style>
