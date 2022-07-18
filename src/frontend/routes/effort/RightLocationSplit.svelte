<script lang="ts">
  import type { Point } from '../../../shared/point';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';

  export let locationData: LocationGraphData;
  export let valueStr: string;
  export let isPrediction: boolean;
  export let visitUnitName: string; // singular
  export let getPoints: (locationData: LocationGraphData) => Point[];
  export let openLocation: (locationData: LocationGraphData) => void;

  const locationName =
    locationData.countyName === null
      ? locationData.localityName + ' (county not specified)'
      : `${locationData.localityName}, ${locationData.countyName}`;

  const points = getPoints(locationData);
  const unitValue = points[points.length - 1].x;
</script>

<div class="row gx-3">
  <div class="col-2 text-end">
    {#if isPrediction}
      <span class="loc_deemph">+</span>{valueStr}
    {:else}
      {valueStr} <span class="loc_deemph">&Delta;</span>
    {/if}
    <span class="loc_deemph">spp.</span>
  </div>
  <div class="col" on:click={() => openLocation(locationData)}>
    <span class="name">{locationName}</span>
    <span class="loc_deemph"
      >({unitValue} {visitUnitName}{unitValue > 1 ? 's' : ''})</span
    >
  </div>
</div>

<style lang="scss">
  @import '../../variables.scss';

  :global(.loc_deemph) {
    color: #6a547f;
    font-size: 0.95em;
  }

  .name {
    color: $blueLinkForeColor;
    cursor: pointer;
    text-decoration: underline;
  }
</style>
