<script lang="ts" context="module">
  import { createSessionStore } from '../../util/session_store';

  enum PredictedDiffUnits {
    Visits = 'visits',
    PersonVisits = 'person-visits'
  }

  const probablityMapUnits = createSessionStore<PredictedDiffUnits>(
    'probability_map_units',
    PredictedDiffUnits.Visits
  );
</script>

<script lang="ts">
  import InfoDialog from '../../dialogs/InfoDialog.svelte';
  import KarstMap, { type MapMarkerSpec } from '../../components/KarstMap.svelte';
  import ScaleDivisions from '../../components/ScaleDivisions.svelte';
  import type { ClusterData } from '../../../frontend-core/clusters/cluster_data';
  import { selectedTaxa } from '../../stores/selectedTaxa';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import { TaxonRank } from '../../../shared/model';

  const KNOWN_LOCATION_COLOR = 'white';
  const ZERO_COLOR = [200, 200, 200];
  const PROBABILITY_COLOR = [220, 0, 0]; // red
  const MAX_SCALE_DIVISIONS = 20;

  export let minProbabilityPercent: number;
  export let dataByCluster: ClusterData[];
  export let close: () => void;

  interface LocationProbability {
    clusterNumbers: number[];
    graphData: LocationGraphData;
    visitsPercent: number;
    personVisitsPercent: number;
  }

  const taxonUniques = Object.keys($selectedTaxa!);
  let description = 'Probability map for the range of ';
  let probabilitiesByLocationID: Record<number, LocationProbability> = {};
  let knownMarkerSpecs: MapMarkerSpec[] = [];
  let markerSpecs: MapMarkerSpec[];
  let featureColors: string[];
  let scaleDivisions: string[] = [];
  let scaleColors: string[] = [];

  let taxonName = '';
  const taxonSpecs = Object.values($selectedTaxa!);
  if (taxonSpecs.length == 1) {
    const taxonUnique = taxonUniques[0];
    const taxonRank = $selectedTaxa![taxonUnique].rank;
    if (
      [TaxonRank.Genus, TaxonRank.Species, TaxonRank.Subspecies].includes(taxonRank)
    ) {
      taxonName = `<i>${taxonName}</i>`;
    }
  }
  description += taxonName == '' ? 'selected taxa' : taxonName;

  for (const taxonUnique of taxonUniques) {
    for (let i = 0; i < dataByCluster.length; ++i) {
      const clusterData = dataByCluster[i];
      const taxaTierStats = clusterData.avgTaxaTierStats;
      const finalTaxaFractionCorrect =
        taxaTierStats[taxaTierStats.length - 1].fractionCorrect;
      let taxonCaveCount = 0;
      for (const graphData of clusterData.locationGraphDataSet) {
        if (graphData.visitsByTaxonUnique[taxonUnique]) {
          ++taxonCaveCount;
          const latitude = graphData.latitude;
          const longitude = graphData.longitude;
          if (latitude && longitude) {
            let label = graphData.localityName;
            if (graphData.countyName) label += ', ' + graphData.countyName;
            label = `<b>${label}</b> (cluster #${i + 1}; existing records)`;
            knownMarkerSpecs.push({
              label,
              latitude,
              longitude
            });
          }
        }
      }
      for (const graphData of clusterData.locationGraphDataSet) {
        const commonFactor =
          100 *
          (taxonCaveCount / clusterData.locationGraphDataSet.length) *
          finalTaxaFractionCorrect;
        const knownVisits = graphData.visitsByTaxonUnique[taxonUnique];
        if (knownVisits === undefined) {
          const visitsProbability =
            graphData.predictedPerVisitDiff !== null
              ? Math.min(commonFactor * graphData.predictedPerVisitDiff, 100)
              : null;
          const personVisitsProbability =
            graphData.predictedPerPersonVisitDiff !== null
              ? Math.min(commonFactor * graphData.predictedPerPersonVisitDiff, 100)
              : null;
          let locationProbability = probabilitiesByLocationID[graphData.locationID];
          if (locationProbability === undefined) {
            locationProbability = {
              clusterNumbers: [],
              graphData,
              visitsPercent: 0,
              personVisitsPercent: 0
            };
            if (!locationProbability.clusterNumbers.includes(i + 1)) {
              locationProbability.clusterNumbers.push(i + 1);
            }
            probabilitiesByLocationID[graphData.locationID] = locationProbability;
          }
          if (
            visitsProbability &&
            visitsProbability > locationProbability.visitsPercent
          ) {
            locationProbability.visitsPercent = visitsProbability;
          }
          if (
            personVisitsProbability &&
            personVisitsProbability > locationProbability.personVisitsPercent
          ) {
            locationProbability.personVisitsPercent = personVisitsProbability;
          }
        }
      }
    }
  }

  const deltaScale = (100 - 1) / (MAX_SCALE_DIVISIONS - 1);
  for (let v = 100; Math.round(v) >= 1; v -= deltaScale) {
    const rounded = Math.round(v);
    scaleDivisions.push(rounded + ' %');
    scaleColors.push(_toScaleColor(100 + 1 - v, 100));
  }
  scaleDivisions.reverse();

  $: {
    markerSpecs = [];
    featureColors = [];

    for (const markerSpec of knownMarkerSpecs) {
      markerSpecs.push(markerSpec);
      featureColors.push(KNOWN_LOCATION_COLOR);
    }

    for (const locationProbability of Object.values(probabilitiesByLocationID)) {
      const graphData = locationProbability.graphData;
      const latitude = graphData.latitude;
      const longitude = graphData.longitude;
      const probabilityPercent =
        $probablityMapUnits == PredictedDiffUnits.Visits
          ? locationProbability.visitsPercent
          : locationProbability.personVisitsPercent;

      if (probabilityPercent >= minProbabilityPercent && latitude && longitude) {
        let label = graphData.localityName;
        if (graphData.countyName) label += ', ' + graphData.countyName;
        label = `<b>${label}</b> (cluster #${locationProbability.clusterNumbers.join(
          ', '
        )}; probability ${probabilityPercent.toFixed(1)}%)`;

        markerSpecs.push({
          label,
          latitude,
          longitude
        });
        featureColors.push(_toScaleColor(probabilityPercent, 100));
      }
    }
  }

  function _toScaleColor(numerator: number, denominator: number): string {
    let fraction = numerator / denominator;
    const r = ZERO_COLOR[0] + fraction * (PROBABILITY_COLOR[0] - ZERO_COLOR[0]);
    const g = ZERO_COLOR[1] + fraction * (PROBABILITY_COLOR[1] - ZERO_COLOR[1]);
    const b = ZERO_COLOR[2] + fraction * (PROBABILITY_COLOR[2] - ZERO_COLOR[2]);
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }
</script>

<InfoDialog title="Map of Clustered Caves" classes="map_dialog" maxWidth="1200px">
  <div class="container-fluid" style="margin-top:-0.5rem">
    <div class="row mb-3 justify-content-center">
      <div class="col">
        <div class="description">{@html description}</div>
      </div>
    </div>
    <div class="row mb-2">
      <div class="col-auto">
        <div class="btn-group" role="group" aria-label="Switch datasets">
          <input
            type="radio"
            class="btn-check"
            bind:group={$probablityMapUnits}
            name="predicted_diff_units"
            id="map_units_{PredictedDiffUnits.Visits}"
            value={PredictedDiffUnits.Visits}
          />
          <label
            class="btn btn-outline-primary"
            for="map_units_{PredictedDiffUnits.Visits}">Visits</label
          >
          <input
            type="radio"
            class="btn-check"
            bind:group={$probablityMapUnits}
            name="predicted_diff_units"
            id="map_units_{PredictedDiffUnits.PersonVisits}"
            value={PredictedDiffUnits.PersonVisits}
          />
          <label
            class="btn btn-outline-primary"
            for="map_units_{PredictedDiffUnits.PersonVisits}">Person-Visits</label
          >
        </div>
      </div>
      <div class="col d-flex align-items-center">
        <ScaleDivisions {scaleDivisions} {scaleColors} />
      </div>
      <div class="col-auto text-end">
        <button class="btn btn-major" type="button" on:click={close}>Close</button>
      </div>
    </div>
  </div>

  <div class="map_area">
    <KarstMap {markerSpecs} baseRGB={[0, 0, 0]} {featureColors} />
  </div>
</InfoDialog>

<style>
  :global(.map_dialog) {
    display: flex;
    position: relative;
    flex-direction: column;
    flex-grow: 1;
    width: 100%;
  }

  .map_area {
    display: flex;
    position: relative;
    flex-direction: column;
    flex-grow: 1;
    width: 100%;
    height: 600px;
  }
  .description {
    text-align: center;
    font-weight: bold;
    font-size: 1.1rem;
  }
</style>
