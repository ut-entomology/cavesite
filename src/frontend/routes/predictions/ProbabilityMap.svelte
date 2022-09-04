<script lang="ts" context="module">
  import { createSessionStore } from '../../util/session_store';

  enum AdditionalTaxaUnits {
    Visits = 'visits',
    PersonVisits = 'person-visits'
  }

  interface ProbabilityMapConfig {
    minProbabilityPercent: number;
    additionalTaxaUnits: AdditionalTaxaUnits;
    factorInTaxaAccuracy: boolean;
    showExistingRecords: boolean;
  }

  const mapConfig = createSessionStore<ProbabilityMapConfig>('probability_map_config', {
    minProbabilityPercent: 25,
    additionalTaxaUnits: AdditionalTaxaUnits.Visits,
    factorInTaxaAccuracy: true,
    showExistingRecords: false
  });
</script>

<script lang="ts">
  import InfoDialog from '../../dialogs/InfoDialog.svelte';
  import KarstMap, { type MapMarkerSpec } from '../../components/KarstMap.svelte';
  import ScaleDivisions from '../../components/ScaleDivisions.svelte';
  import ProbabilityBarGraph, {
    type LocationProbabilityRow
  } from './ProbabilityBarGraph.svelte';
  import type { ClusterData } from '../../../frontend-core/clusters/cluster_data';
  import { selectedTaxa } from '../../stores/selectedTaxa';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import { TaxonRank } from '../../../shared/model';

  const KNOWN_LOCATION_COLOR = 'white';
  const ZERO_COLOR = [200, 200, 200];
  const PROBABILITY_COLOR = [220, 0, 220]; // predictive pink
  const MAX_SCALE_DIVISIONS = 20;

  export let dataByCluster: ClusterData[];
  export let close: () => void;

  interface LocationProbability {
    clusterNumbers: number[];
    graphData: LocationGraphData;
    visitsPercentNoAccuracy: number;
    personVisitsPercentNoAccuracy: number;
    visitsPercentWithAccuracy: number;
    personVisitsPercentWithAccuracy: number;
  }

  let minProbabilityPercent = $mapConfig.minProbabilityPercent;
  let additionalTaxaUnits = $mapConfig.additionalTaxaUnits;
  let factorInTaxaAccuracy = $mapConfig.factorInTaxaAccuracy;
  let showExistingRecords = $mapConfig.showExistingRecords;

  const taxonUniques = Object.keys($selectedTaxa!);
  let title = 'Probability Map for ';
  let probabilitiesByLocationID: Record<number, LocationProbability> = {};
  let knownMarkerSpecs: MapMarkerSpec[] = [];
  let markerSpecs: MapMarkerSpec[];
  let featureColors: string[];
  let scaleDivisions: string[] = [];
  let scaleColors: string[] = [];
  let ascendingLocationProbabilityRows = false;
  let sourceLocationRows: LocationProbabilityRow[];
  let locationRows: LocationProbabilityRow[];

  let taxonName = '';
  const taxonSpecs = Object.values($selectedTaxa!);
  if (taxonSpecs.length == 1) {
    taxonName = taxonUniques[0];
    const taxonRank = $selectedTaxa![taxonName].rank;
    if (
      [TaxonRank.Genus, TaxonRank.Species, TaxonRank.Subspecies].includes(taxonRank)
    ) {
      taxonName = `<i>${taxonName}</i>`;
    }
  }
  title += taxonName == '' ? 'Selected Taxa' : taxonName;

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
          100 * (taxonCaveCount / clusterData.locationGraphDataSet.length);
        const knownVisits = graphData.visitsByTaxonUnique[taxonUnique];
        if (knownVisits === undefined) {
          const visitsProbabilityNoAccuracy =
            graphData.predictedPerVisitDiff !== null
              ? Math.min(commonFactor * graphData.predictedPerVisitDiff, 100)
              : null;
          const personVisitsProbabilityNoAccuracy =
            graphData.predictedPerPersonVisitDiff !== null
              ? Math.min(commonFactor * graphData.predictedPerPersonVisitDiff, 100)
              : null;
          const visitsProbabilityWithAccuracy = visitsProbabilityNoAccuracy
            ? visitsProbabilityNoAccuracy * finalTaxaFractionCorrect
            : null;
          const personVisitsProbabilityWithAccuracy = personVisitsProbabilityNoAccuracy
            ? personVisitsProbabilityNoAccuracy * finalTaxaFractionCorrect
            : null;
          let locationProbability = probabilitiesByLocationID[graphData.locationID];
          if (locationProbability === undefined) {
            locationProbability = {
              clusterNumbers: [],
              graphData,
              visitsPercentNoAccuracy: 0,
              personVisitsPercentNoAccuracy: 0,
              visitsPercentWithAccuracy: 0,
              personVisitsPercentWithAccuracy: 0
            };
            if (!locationProbability.clusterNumbers.includes(i + 1)) {
              locationProbability.clusterNumbers.push(i + 1);
            }
            probabilitiesByLocationID[graphData.locationID] = locationProbability;
          }
          _updateProbability(
            locationProbability,
            'visitsPercentNoAccuracy',
            visitsProbabilityNoAccuracy
          );
          _updateProbability(
            locationProbability,
            'personVisitsPercentNoAccuracy',
            personVisitsProbabilityNoAccuracy
          );
          _updateProbability(
            locationProbability,
            'visitsPercentWithAccuracy',
            visitsProbabilityWithAccuracy
          );
          _updateProbability(
            locationProbability,
            'personVisitsPercentWithAccuracy',
            personVisitsProbabilityWithAccuracy
          );
        }
      }
    }
  }

  const lowestPercent = 0;
  const deltaScale = (100 - lowestPercent) / (MAX_SCALE_DIVISIONS - 1);
  for (let v = 100; Math.round(v) >= lowestPercent; v -= deltaScale) {
    const rounded = Math.round(v);
    scaleDivisions.push(rounded + ' %');
    scaleColors.push(_toScaleColor(100 + lowestPercent - v, 100));
  }
  scaleDivisions.reverse();

  $: {
    if (minProbabilityPercent < 0) minProbabilityPercent = 0;
    if (minProbabilityPercent > 100) minProbabilityPercent = 100;
    $mapConfig = {
      minProbabilityPercent,
      additionalTaxaUnits,
      factorInTaxaAccuracy,
      showExistingRecords
    };
  }

  $: {
    markerSpecs = [];
    featureColors = [];
    sourceLocationRows = [];
    locationRows = [];

    if (showExistingRecords) {
      for (const markerSpec of knownMarkerSpecs) {
        markerSpecs.push(markerSpec);
        featureColors.push(KNOWN_LOCATION_COLOR);
      }
    }

    for (const locationProbability of Object.values(probabilitiesByLocationID)) {
      const graphData = locationProbability.graphData;
      const latitude = graphData.latitude;
      const longitude = graphData.longitude;
      let probabilityPercent: number;
      if (additionalTaxaUnits == AdditionalTaxaUnits.Visits) {
        probabilityPercent = factorInTaxaAccuracy
          ? locationProbability.visitsPercentWithAccuracy
          : locationProbability.visitsPercentNoAccuracy;
      } else {
        probabilityPercent = factorInTaxaAccuracy
          ? locationProbability.personVisitsPercentWithAccuracy
          : locationProbability.personVisitsPercentNoAccuracy;
      }

      if (probabilityPercent >= minProbabilityPercent && latitude && longitude) {
        let label = graphData.localityName;
        if (graphData.countyName) label += ', ' + graphData.countyName;
        sourceLocationRows.push({
          probability: probabilityPercent,
          locationName: label,
          clusterNumbers: locationProbability.clusterNumbers
        });
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

  async function getLocationRows(
    count: number,
    increasing: boolean
  ): Promise<[LocationProbabilityRow[], boolean]> {
    if (locationRows.length == 0 || increasing != ascendingLocationProbabilityRows) {
      sourceLocationRows.sort((a, b) => {
        if (a.probability == b.probability) return 0;
        return a.probability - b.probability;
      });
      if (!increasing) sourceLocationRows.reverse();
      ascendingLocationProbabilityRows = increasing;
      locationRows = sourceLocationRows.slice(0, count);
    }
    // Don't change locationRows, as that would create an infinite loop of updates.
    return [sourceLocationRows.slice(0, count), count < sourceLocationRows.length];
  }

  function _toScaleColor(numerator: number, denominator: number): string {
    let fraction = numerator / denominator;
    const r = ZERO_COLOR[0] + fraction * (PROBABILITY_COLOR[0] - ZERO_COLOR[0]);
    const g = ZERO_COLOR[1] + fraction * (PROBABILITY_COLOR[1] - ZERO_COLOR[1]);
    const b = ZERO_COLOR[2] + fraction * (PROBABILITY_COLOR[2] - ZERO_COLOR[2]);
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }

  function _updateProbability(
    locationProbability: LocationProbability,
    propertyName: Extract<
      keyof LocationProbability,
      | 'visitsPercentNoAccuracy'
      | 'personVisitsPercentNoAccuracy'
      | 'visitsPercentWithAccuracy'
      | 'personVisitsPercentWithAccuracy'
    >,
    probability: number | null
  ): void {
    if (probability && probability > locationProbability[propertyName]) {
      locationProbability[propertyName] = probability;
    }
  }
</script>

<InfoDialog {title} classes="map_dialog" maxWidth="1200px">
  <div class="row mb-3 gx-4 justify-content-center" style="margin-top: -0.5rem">
    <div class="col-auto">
      Min. probability
      <input
        class="ms-1 probability_input"
        bind:value={minProbabilityPercent}
        disabled={$selectedTaxa === null}
      />
      %
    </div>
    <div class="col-auto">
      <div class="check_input">
        <input
          id="factor_accuracy_input"
          class="form-check-input"
          type="checkbox"
          bind:checked={factorInTaxaAccuracy}
        />
        <label class="form-check-label" for="factor_accuracy_input"
          >Factor in historical accuracy of taxa predictions</label
        >
      </div>
    </div>
    <div class="col-auto">
      <div class="check_input">
        <input
          id="existing_records_input"
          class="form-check-input"
          type="checkbox"
          bind:checked={showExistingRecords}
        />
        <label class="form-check-label" for="existing_records_input"
          >Show existing records</label
        >
      </div>
    </div>
  </div>
  <div class="row ms-1 me-1 mb-3">
    <div class="col-auto">
      <div
        class="btn-group"
        role="group"
        aria-label="Predicted additional taxa for visits or person-visits"
      >
        <input
          type="radio"
          class="btn-check"
          bind:group={additionalTaxaUnits}
          name="predicted_diff_units"
          id="map_units_{AdditionalTaxaUnits.Visits}"
          value={AdditionalTaxaUnits.Visits}
        />
        <label
          class="btn btn-outline-primary"
          for="map_units_{AdditionalTaxaUnits.Visits}">Visits</label
        >
        <input
          type="radio"
          class="btn-check"
          bind:group={additionalTaxaUnits}
          name="predicted_diff_units"
          id="map_units_{AdditionalTaxaUnits.PersonVisits}"
          value={AdditionalTaxaUnits.PersonVisits}
        />
        <label
          class="btn btn-outline-primary"
          for="map_units_{AdditionalTaxaUnits.PersonVisits}">Person-Visits</label
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

  <div class="map_area">
    <KarstMap {markerSpecs} baseRGB={[0, 0, 0]} {featureColors} />
  </div>

  <ProbabilityBarGraph
    {taxonName}
    {locationRows}
    {getLocationRows}
    increasing={ascendingLocationProbabilityRows}
  />
</InfoDialog>

<style lang="scss">
  @import '../../variables.scss';

  :global(.map_dialog) {
    display: flex;
    position: relative;
    flex-direction: column;
    flex-grow: 1;
    width: 100%;
  }

  .probability_input {
    width: 3rem;
    border-radius: $border-radius;
    padding-left: 0.4rem;
  }
  .check_input {
    display: inline-block;
    padding-top: 0.2rem;
  }

  .map_area {
    display: flex;
    position: relative;
    flex-direction: column;
    flex-grow: 1;
    width: 100%;
    height: 600px;
  }
</style>
