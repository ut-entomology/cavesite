<script lang="ts">
  import SortedRowGrower, {
    type RowItemGetter
  } from '../../components/SortedRowGrower.svelte';
  import type { QueryRow } from '../../../shared/general_query';

  const MIN_ROWS = 20;
  const ROW_INCREMENT = 80;

  export let taxonRows: QueryRow[];
  export let getTaxonRows: RowItemGetter;
  export let increasing: boolean;

  function _toItemHTML(taxonRow: QueryRow): string {
    const taxonUnique = taxonRow.taxonUnique!;
    let ancestors: string[] = [];
    let name = taxonRow.className;
    if (name && name != taxonUnique) ancestors.push(name);
    name = taxonRow.orderName;
    if (name && name != taxonUnique) ancestors.push(name);
    name = taxonRow.familyName;
    if (name && name != taxonUnique) ancestors.push(name);

    if (ancestors.length == 0) return taxonUnique;
    return `${taxonRow.taxonUnique!} <span class="stats_deemph">(${ancestors.join(
      ' '
    )})</span>`;
  }
</script>

{#key taxonRows}
  <SortedRowGrower
    title="All taxa available for the above selected locations"
    itemsClasses="location_taxon_rows"
    minRows={MIN_ROWS}
    rowIncrement={ROW_INCREMENT}
    {increasing}
    getItems={getTaxonRows}
    items={taxonRows}
    let:item
  >
    <div slot="description">
      The above selected taxa are found in the following localities, sorted by the
      number of specimen records they have.
    </div>
    <div class="row gx-3 taxon_row">
      <div class="col-3 text-center">
        {item.recordCount} <span class="stats_deemph">records</span>
      </div>
      <div class="col">{@html _toItemHTML(item)}</div>
    </div>
  </SortedRowGrower>
{/key}

<style lang="scss">
  :globel(.location_taxon_rows) {
    margin-top: 1rem;
    font-size: 0.95rem;
  }
  :global(.location_taxon_rows .row + .row:nth-child(even)) {
    background-color: #ddd;
  }
  :global(.location_taxon_rows .row + .row:nth-child(odd)) {
    background-color: #eee;
  }
  .taxon_row {
    margin-bottom: 2px;
  }
</style>
