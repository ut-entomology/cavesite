<script lang="ts">
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';

  export let locationData: LocationGraphData;
  export let valueStr: string;
  export let isDelta: boolean;

  const locationName =
    locationData.countyName === null
      ? locationData.localityName + ' (county not specified)'
      : `${locationData.localityName}, ${locationData.countyName}`;
</script>

<div class="row">
  <div class="col">
    {valueStr}
    {isDelta ? '&#x394;' : ''}spp.
  </div>
  <div class="col">{locationName}</div>
</div>
