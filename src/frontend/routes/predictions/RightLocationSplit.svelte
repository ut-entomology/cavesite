<script lang="ts">
  import type { Point } from '../../../shared/point';
  import { EffortFlags } from '../../../shared/model';
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

  const superscripts: string[] = [];
  if (locationData.flags & EffortFlags.multiDayPersonVisit) {
    superscripts.push('E');
  }
  if (locationData.flags & EffortFlags.missingDayOfMonth) {
    superscripts.push('M');
  }
  if (locationData.flags & EffortFlags.trap) {
    superscripts.push('T');
  }
  if (locationData.flags & EffortFlags.missingDate) {
    superscripts.push('X');
  }
  if (locationData.flags & EffortFlags.missingMonth) {
    superscripts.push('Y');
  }
  const html = superscripts.join(',');
  const footnoteLinks = '' ? '' : `<sup>${html}</sup>`;
</script>

<div class="row gx-3">
  <div class="col-2 {isPrediction ? 'text-end' : 'text-center'}">
    <span class="stats_deemph">+</span>{valueStr}
    <span class="stats_deemph">spp.</span>
  </div>
  <div class="col" on:click={() => openLocation(locationData)}>
    <span class="location_name">{locationName}</span>

    <span class="stats_deemph"
      >({unitValue}
      {visitUnitName}{unitValue > 1 ? 's' : ''}){@html footnoteLinks}</span
    >
  </div>
</div>
