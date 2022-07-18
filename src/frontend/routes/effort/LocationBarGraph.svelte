<script lang="ts">
  import type { Point } from '../../../shared/point';
  import SplitHorizontalBar, { type BarSplitSpec } from './SplitHorizontalBar.svelte';
  import RightLocationSplit from './RightLocationSplit.svelte';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import type { PredictionTierStat } from '../../../frontend-core/clusters/cluster_data';

  export let dataset: LocationGraphData[];
  export let tierStats: PredictionTierStat[] | null;
  export let getValue: (locationData: LocationGraphData) => number | null;
  export let getPoints: (locationData: LocationGraphData) => Point[];
  export let greatestValue: number;

  function _toLeftSplitSpec(index: number): BarSplitSpec {
    return {
      percent: 100 * tierStats![index].fractionCorrect,
      barColor: '#ffffd1',
      backgroundColor: '#999'
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
      backgroundColor: '#999'
    };
  }

  function _toPercentStr(fraction: number): string {
    return fraction.toFixed(1);
  }
</script>

{#each dataset as locationData, i}
  {#if tierStats === null}
    <SplitHorizontalBar rightSplitSpec={_toRightSplitSpec(locationData)}>
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
      leftSplitSpec={_toLeftSplitSpec(i)}
      rightSplitSpec={_toRightSplitSpec(locationData)}
    >
      <div slot="left">
        <span class="arrow">&#x2906;</span>
        {_toPercentStr(100 * tierStats[i].fractionCorrect)}
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

<style>
  .arrow {
    transform: rotate(90deg);
  }
</style>
