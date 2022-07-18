<script lang="ts">
  import type { Point } from '../../../shared/point';
  import SplitHorizontalBar, { type BarSplitSpec } from './SplitHorizontalBar.svelte';
  import RightLocationSplit from './RightLocationSplit.svelte';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import type { PredictionTierStat } from '../../../frontend-core/clusters/cluster_data';

  export let dataset: LocationGraphData[];
  export let tierStats: PredictionTierStat[] | null = null;
  export let getValue: (locationData: LocationGraphData) => number | null;
  export let getPoints: (locationData: LocationGraphData) => Point[];
  export let greatestValue: number;

  function _toLeftSplitSpec(index: number): BarSplitSpec {
    return {
      percent: index < tierStats!.length ? _toStatPercent(index) : 0,
      barColor: '#fff5ba',
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
      barColor: '#d5aaff',
      backgroundColor: '#ddd'
    };
  }

  function _toStatPercent(index: number): number {
    return 100 * tierStats![index].fractionCorrect;
  }

  function _toPercentStr(fraction: number): string {
    return fraction.toFixed(1);
  }
</script>

<div class="location_bar_graph">
  {#each dataset as locationData, i}
    {#if tierStats === null}
      <SplitHorizontalBar
        classes="bar_spacer"
        rightSplitSpec={_toRightSplitSpec(locationData)}
      >
        <div slot="right">
          <RightLocationSplit
            {locationData}
            valueStr={_toRightValue(locationData).toString()}
            isDelta={false}
          />
        </div>
      </SplitHorizontalBar>
    {:else}
      <SplitHorizontalBar
        classes="bar_spacer"
        leftSplitSpec={_toLeftSplitSpec(i)}
        rightSplitSpec={_toRightSplitSpec(locationData)}
      >
        <div slot="left">
          {#if i < tierStats.length}
            {_toPercentStr(_toStatPercent(i))} %
            <div class="arrow">&#x2906;</div>
          {:else}
            <div class="no_stats">no stats</div>
          {/if}
        </div>
        <div slot="right">
          <RightLocationSplit
            {locationData}
            valueStr={_toRightValue(locationData).toFixed(1)}
            isDelta={true}
          />
        </div>
      </SplitHorizontalBar>
    {/if}
  {/each}
</div>

<style>
  .location_bar_graph {
    font-size: 0.95rem;
  }
  :global(.bar_spacer) {
    margin-bottom: 2px;
  }
  .arrow {
    display: inline-block;
    transform: rotate(90deg);
    color: #655179;
  }
  .no_stats {
    background-color: #ffbebc;
  }
</style>
