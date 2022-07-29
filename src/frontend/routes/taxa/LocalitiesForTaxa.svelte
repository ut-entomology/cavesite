<script lang="ts">
  import SortedRowGrower, {
    type RowItemGetter
  } from '../../components/SortedRowGrower.svelte';
  import type { QueryRow } from '../../../shared/general_query';

  const MIN_ROWS = 20;
  const ROW_INCREMENT = 80;

  export let locationRows: QueryRow[];
  export let getLocationRows: RowItemGetter;
  export let increasing: boolean;

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
    {increasing}
    getItems={getLocationRows}
    items={locationRows}
    let:item
  >
    <div slot="description">
      The following are all the localities having any of the above selected taxa, sorted
      by the number of records found among the taxa.
    </div>
    <div class="row gx-3 location_row">
      <div class="col-3 text-center">
        {item.recordCount} <span class="stats_deemph">records</span>
      </div>
      <div class="col">{@html _toItemHTML(item)}</div>
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
