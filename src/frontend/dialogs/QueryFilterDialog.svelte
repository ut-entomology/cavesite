<script lang="ts">
  import { dndzone, Item } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';

  import ModalDialog from '../common/ModalDialog.svelte';
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

  export let onClose: () => void;
  export let onQuery: (query: GeneralQuery) => void;

  let filterForTaxa = false;
  let draggableItems: DraggableItem[] = [];
  let columnSpecs: QueryColumnSpec[] = [];

  for (let i = 0; i < QueryColumnID._LENGTH; ++i) {
    const columnInfo = columnInfoMap[i];
    draggableItems.push({ id: columnInfo.columnID, info: columnInfo });
  }

  function handleSort(e: CustomEvent<DndEvent>) {
    draggableItems = e.detail.items as DraggableItem[];
  }

  function getTaxonFilter(): QueryTaxonFilter {
    //
  }

  const submitQuery = () => {
    onQuery({
      columnSpecs,
      taxonFilter: filterForTaxa ? getTaxonFilter() : null
    });
  };
</script>

<ModalDialog title="New Query" contentClasses="user-form-content">
  <div class="custom-control custom-switch">
    <input
      type="checkbox"
      bind:checked={filterForTaxa}
      class="custom-control-input"
      id="taxonFilterSwitch"
    />
    <label class="custom-control-label" for="taxonFilterSwitch"
      >Filter for selected taxa</label
    >
  </div>

  <section
    use:dndzone={{ items: draggableItems, flipDurationMs: FLIP_DURATION_MILLIS }}
    on:consider={handleSort}
    on:finalize={handleSort}
  >
    {#each draggableItems as item (item.id)}
      <div class="column-spec" animate:flip={{ duration: FLIP_DURATION_MILLIS }}>
        {item.info.fullName}
      </div>
    {/each}
  </section>

  <div class="row g-2">
    <div class="col-12 text-center">
      <button class="btn btn-minor" type="button" on:click={onClose}>Cancel</button>
      <button class="btn btn-major" type="button" on:click={() => onQuery(TBD)}
        >Submit Query</button
      >
    </div>
  </div>
</ModalDialog>

<style>
  button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }

  .column-spec {
    height: 1.5em;
    width: 10em;
    text-align: center;
    border: 1px solid black;
    margin: 0.2em;
    padding: 0.3em;
  }
</style>
