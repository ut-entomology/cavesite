<script lang="ts" context="module">
  export interface LocationProbabilityRow {
    clusterNumber: number;
    locationName: string;
    probability: number;
  }
</script>

<script lang="ts">
  import SortedRowGrower, {
    type RowItemGetter
  } from '../../components/SortedRowGrower.svelte';
  import SplitHorizontalBar, { type BarSplitSpec } from './SplitHorizontalBar.svelte';

  const MIN_ROWS = 50;
  const ROW_INCREMENT = 50;

  export let taxonName: string;
  export let locationRows: LocationProbabilityRow[];
  export let getLocationRows: RowItemGetter;
  export let increasing: boolean;

  function _toItemHTML(row: LocationProbabilityRow): string {
    return `${row.locationName} <span class="stats_deemph">(cluster #${row.clusterNumber})</span>`;
  }

  function _toRightSplitSpec(item: any): BarSplitSpec {
    return {
      percent: item.probability,
      barColor: '#faf2c7',
      backgroundColor: '#ddd'
    };
  }
</script>

{#key locationRows}
  <SortedRowGrower
    title="Range extension probabilities for {taxonName == ''
      ? 'selected taxa'
      : taxonName}"
    itemsClasses="location_probability_rows"
    minRows={MIN_ROWS}
    rowIncrement={ROW_INCREMENT}
    {increasing}
    getItems={getLocationRows}
    items={locationRows}
    let:item
  >
    <div slot="description">
      These are all the locations that satisfy the probability criteria for the selected
      taxa, sorted by the currently calculated probability.
    </div>
    <SplitHorizontalBar classes="outer_bar" rightSplitSpec={_toRightSplitSpec(item)}>
      <div slot="right">
        <div class="row gx-3 location_row">
          <div class="col-3 text-center">
            {item.probability.toFixed(1)} <span class="stats_deemph">%</span>
          </div>
          <div class="col">{@html _toItemHTML(item)}</div>
        </div>
      </div>
    </SplitHorizontalBar>
  </SortedRowGrower>
{/key}

<style lang="scss">
  :globel(.location_probability_rows) {
    margin-top: 1.5rem;
    font-size: 0.95rem;
  }
  // .location_row {
  //   margin-bottom: 2px;
  // }
</style>
