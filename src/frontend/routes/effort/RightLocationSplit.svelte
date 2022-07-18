<script lang="ts">
  import type { Point } from '../../../shared/point';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';

  export let locationData: LocationGraphData;
  export let valueStr: string;
  export let isDelta: boolean;
  export let visitUnitName: string; // singular
  export let getPoints: (locationData: LocationGraphData) => Point[];

  const locationName =
    locationData.countyName === null
      ? locationData.localityName + ' (county not specified)'
      : `${locationData.localityName}, ${locationData.countyName}`;

  const points = getPoints(locationData);
  const unitValue = points[points.length - 1].x;
</script>

<div class="row gx-2">
  <div class="col-2 text-end">
    {valueStr}
    <span class="units">{@html isDelta ? '&#x394;' : ''} spp.</span>
  </div>
  <div class="col">
    {locationName}
    <span class="visits">({unitValue} {visitUnitName}{unitValue > 1 ? 's' : ''})</span>
  </div>
</div>

<style>
  .units,
  .visits {
    color: #6a547f;
    font-size: 0.95em;
  }
</style>
