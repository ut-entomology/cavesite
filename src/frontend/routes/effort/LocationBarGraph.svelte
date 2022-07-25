<script lang="ts">
  import SplittableBarGraph from './SplittableBarGraph.svelte';
  import type { RowItemGetter } from './SortedRowGrower.svelte';
  import RightLocationSplit from './RightLocationSplit.svelte';
  import type { Point } from '../../../shared/point';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import type { PredictionTierStat } from '../../../frontend-core/clusters/prediction_stats';

  export let title: string;
  export let tierStats: PredictionTierStat[] | null = null;
  export let getValue: (locationData: LocationGraphData) => number | null;
  export let getPoints: (locationData: LocationGraphData) => Point[];
  export let visitUnitName: string; // singular
  export let greatestValue: number;
  export let items: any[];
  export let getItems: RowItemGetter;
  export let openLocation: (locationData: LocationGraphData) => void;

  $: titleSuffix = ` <span class="cave_count">(${items.length} cave${
    items.length > 1 ? 's' : ''
  })</span>`;

  function _toRightValue(locationData: LocationGraphData): number {
    let value = getValue(locationData);
    return value !== null ? value : getPoints(locationData)[0].y;
  }

  function getItemPercent(locationData: LocationGraphData): number {
    return (100 * _toRightValue(locationData)) / greatestValue;
  }
</script>

{#key items}
  <SplittableBarGraph
    title={title + titleSuffix}
    {tierStats}
    {getItems}
    {items}
    {getItemPercent}
  >
    <slot slot="description" />
    <div slot="single" let:item>
      <RightLocationSplit
        locationData={item}
        valueStr={_toRightValue(item).toString()}
        isPrediction={false}
        {visitUnitName}
        {getPoints}
        {openLocation}
      />
    </div>
    <div slot="right" let:item>
      <RightLocationSplit
        locationData={item}
        valueStr={_toRightValue(item).toFixed(1)}
        isPrediction={true}
        {visitUnitName}
        {getPoints}
        {openLocation}
      />
    </div>
  </SplittableBarGraph>
{/key}

<style lang="scss">
  @import '../../variables.scss';

  :global(.cave_count) {
    font-size: 0.95em;
    color: #888;
  }
  :global(.outer_bar:hover) {
    cursor: pointer;
  }
  :global(.outer_bar:hover .location_name) {
    color: $blueLinkForeColor;
    text-decoration: underline;
  }
</style>
