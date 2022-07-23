<script lang="ts">
  import InfoDialog from '../../dialogs/InfoDialog.svelte';
  import EffortGraph from './EffortGraph.svelte';
  import TaxonBarGraph from './TaxonBarGraph.svelte';
  import LocationFootnotes from './LocationFootnotes.svelte';
  import type { EffortGraphSpec } from '../../../frontend-core/clusters/effort_graph_spec';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import { DatasetType, getGraphSpec } from './dataset_type';
  import type { ClusteringConfig } from '../../../frontend-core/clusters/cluster_data';

  export let config: ClusteringConfig;
  export let clusterVisitsByTaxonUnique: Record<string, number>;
  export let locationGraphData: LocationGraphData;
  export let locationGraphDataSet: LocationGraphData[];
  export let close: () => void;

  let datasetType = DatasetType.personVisits;
  let graphSpec: EffortGraphSpec;
  let missingTaxaVisitsByTaxonUnique: Record<string, number> = Object.assign(
    {},
    clusterVisitsByTaxonUnique
  );
  for (const taxonUnique of Object.keys(locationGraphData.visitsByTaxonUnique)) {
    delete missingTaxaVisitsByTaxonUnique[taxonUnique];
  }

  const titleSuffix = locationGraphData.countyName
    ? ',<br/>' + locationGraphData.countyName
    : '';

  $: graphSpec = getGraphSpec(config, datasetType, false);
</script>

<InfoDialog
  title={locationGraphData.localityName + titleSuffix}
  classes="location_effort_dialog"
  maxWidth="95%"
  onClose={close}
>
  <div class="container-fluid location_effort_dialog">
    <div class="row justify-content-center">
      <div class="col-auto">
        <div class="btn-group" role="group" aria-label="Switch datasets">
          <input
            type="radio"
            class="btn-check"
            bind:group={datasetType}
            name="location_dataset"
            id="location_visits"
            value={DatasetType.visits}
          />
          <label class="btn btn-outline-primary" for="location_visits">Visits</label>
          <input
            type="radio"
            class="btn-check"
            bind:group={datasetType}
            name="location_dataset"
            id="location_person_visits"
            value={DatasetType.personVisits}
          />
          <label class="btn btn-outline-primary" for="location_person_visits"
            >Person-Visits</label
          >
        </div>
      </div>
    </div>

    <div class="row mt-3 mb-4">
      <div class="col" style="height: 350px">
        <EffortGraph
          title={graphSpec.graphTitle}
          graphDataSet={[locationGraphData]}
          {graphSpec}
          dataPointColor="black"
          dataPointWidth={2}
        />
      </div>
    </div>
    <LocationFootnotes flags={locationGraphData.flags} singleCave={true} />

    <hr />
    <TaxonBarGraph
      title="Relative frequency of taxa found in this cave"
      visitsByTaxonUnique={locationGraphData.visitsByTaxonUnique}
      locationGraphDataSet={[locationGraphData]}
    />

    <hr />
    <TaxonBarGraph
      title="Relative frequency of taxa found in this cluster but NOT in this cave"
      visitsByTaxonUnique={missingTaxaVisitsByTaxonUnique}
      {locationGraphDataSet}
    />
  </div>
</InfoDialog>

<style lang="scss">
  :global(.location_effort_dialog) {
    margin-bottom: -0.5rem;
  }
</style>
