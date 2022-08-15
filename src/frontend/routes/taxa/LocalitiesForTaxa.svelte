<script lang="ts">
  import SortedRowGrower, {
    type RowItemGetter
  } from '../../components/SortedRowGrower.svelte';
  import type { QueryRow } from '../../../shared/general_query';

  const MIN_ROWS = 20;
  const ROW_INCREMENT = 80;

  export let locationRows: QueryRow[];
  export let getLocationRows: RowItemGetter;
  export let ascending: boolean;

  function _toItemHTML(locationRow: QueryRow): string {
    let name = locationRow.localityName!;
    if (locationRow.countyName)
      name = `${name} <span class="stats_deemph">(${locationRow.countyName})</span>`;
    return name;
  }
</script>

{#key locationRows}
  <SortedRowGrower
    title="Localities having any of the above selected taxa"
    itemsClasses="taxa_location_rows"
    minRows={MIN_ROWS}
    rowIncrement={ROW_INCREMENT}
    increasing={ascending}
    sortOptions={['Ascending', 'Descending']}
    getItems={getLocationRows}
    items={locationRows}
    let:item
  >
    <div slot="description">
      The following are all the localities having any of the above selected taxa.
    </div>
    <div class="row gx-3 location_row">
      <div class="col-sm-4">{item.countyName || '(no county given)'}</div>
      <div class="col-sm-6">{item.localityName}</div>
      <div class="col-sm-2 text-end">{item.recordCount} records</div>
    </div>
  </SortedRowGrower>
{/key}

<style lang="scss">
  :globel(.taxa_location_rows) {
    margin-top: 1rem;
    font-size: 0.95rem;
  }
  :global(.taxa_location_rows .row + .row:nth-child(even)) {
    background-color: #ddd;
  }
  :global(.taxa_location_rows .row + .row:nth-child(odd)) {
    background-color: #eee;
  }
  .location_row {
    margin-bottom: 2px;
  }
</style>
