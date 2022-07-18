<script lang="ts">
  import SortedRowGrower, { type RowItemGetter } from './SortedRowGrower.svelte';
  import SplitHorizontalBar, { type BarSplitSpec } from './SplitHorizontalBar.svelte';
  import RightLocationSplit from './RightLocationSplit.svelte';
  import type { Point } from '../../../shared/point';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import type { PredictionTierStat } from '../../../frontend-core/clusters/cluster_data';

  const MIN_ROWS = 10;
  const ROW_INCREMENT = 40;

  export let heading: string;
  export let tierStats: PredictionTierStat[] | null = null;
  export let getValue: (locationData: LocationGraphData) => number | null;
  export let getPoints: (locationData: LocationGraphData) => Point[];
  export let visitUnitName: string; // singular
  export let greatestValue: number;
  export let items: any[];
  export let getItems: RowItemGetter;
  export let openLocation: (locationData: LocationGraphData) => void;

  $: headingSuffix = ` <span class="cave_count">(${items.length} cave${
    items.length > 1 ? 's' : ''
  })</span>`;

  function _isTierStatIndex(index: number, increasing: boolean): boolean {
    return increasing
      ? index >= items.length - tierStats!.length
      : index < tierStats!.length;
  }

  function _toLeftSplitSpec(index: number, increasing: boolean): BarSplitSpec {
    return {
      percent: _isTierStatIndex(index, increasing)
        ? _toStatPercent(index, increasing)
        : 0,
      barColor: '#faf2c7',
      backgroundColor: '#ddd'
    };
  }

  function _toRightValue(locationData: LocationGraphData): number {
    let value = getValue(locationData);
    return value !== null ? value : getPoints(locationData)[0].y;
  }

  function _toRightSplitSpec(locationData: LocationGraphData): BarSplitSpec {
    return {
      percent: (100 * _toRightValue(locationData)) / greatestValue,
      barColor: '#d1c0fe',
      backgroundColor: '#ddd'
    };
  }

  function _toStatPercent(index: number, increasing: boolean): number {
    if (increasing) index = items.length - index - 1;
    return 100 * tierStats![index].fractionCorrect;
  }

  function _toPercentStr(fraction: number): string {
    return fraction.toFixed(1);
  }
</script>

{#key items}
  <SortedRowGrower
    heading={heading + headingSuffix}
    itemsClasses="location_bar_graph"
    minRows={MIN_ROWS}
    rowIncrement={ROW_INCREMENT}
    increasing={false}
    {getItems}
    {items}
    let:item
    let:index
    let:increasing
  >
    {#if tierStats === null}
      <SplitHorizontalBar classes="bar_spacer" rightSplitSpec={_toRightSplitSpec(item)}>
        <div slot="right">
          <RightLocationSplit
            locationData={item}
            valueStr={_toRightValue(item).toString()}
            isPrediction={false}
            {visitUnitName}
            {getPoints}
            {openLocation}
          />
        </div>
      </SplitHorizontalBar>
    {:else}
      <SplitHorizontalBar
        classes="bar_spacer"
        leftSplitSpec={_toLeftSplitSpec(index, increasing)}
        rightSplitSpec={_toRightSplitSpec(item)}
      >
        <div slot="left">
          {#if _isTierStatIndex(index, increasing)}
            {_toPercentStr(_toStatPercent(index, increasing))}
            <span class="percent">%</span>
            <div class="above_arrow">&#x2906;</div>
          {:else}
            <div class="no_stats">no stats</div>
          {/if}
        </div>
        <div slot="right">
          <RightLocationSplit
            locationData={item}
            valueStr={_toRightValue(item).toFixed(1)}
            isPrediction={true}
            {visitUnitName}
            {getPoints}
            {openLocation}
          />
        </div>
      </SplitHorizontalBar>
    {/if}
  </SortedRowGrower>
{/key}

<style lang="scss">
  :globel(.location_bar_graph) {
    margin-top: 1rem;
    font-size: 0.95rem;
  }
  :global(.cave_count) {
    font-size: 0.95em;
    color: #888;
  }
  :global(.bar_spacer) {
    margin-bottom: 2px;
  }
  .percent {
    font-size: 0.9em;
  }
  .above_arrow {
    display: inline-block;
    transform: rotate(90deg);
    color: #6a547f;
  }
  .no_stats {
    background-color: #f2cbcb;
    // background-color: #faf2c7;
  }
</style>
