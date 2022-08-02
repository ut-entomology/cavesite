<script lang="ts">
  import InfoDialog from '../../dialogs/InfoDialog.svelte';
  import EffortGraph from './EffortGraph.svelte';
  import SingleEffortGraph from './SingleEffortGraph.svelte';
  import TaxonBarGraph from './TaxonBarGraph.svelte';
  import LocationFootnotes from './LocationFootnotes.svelte';
  import MoreLess from '../../components/MoreLess.svelte';
  import type { EffortGraphSpec } from '../../../frontend-core/clusters/effort_graph_spec';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import { DatasetType, getGraphSpec } from './dataset_type';
  import type { ClusteringConfig } from '../../../frontend-core/clusters/clustering_config';
  import type { PredictionTierStat } from '../../../frontend-core/clusters/prediction_stats';

  export let config: ClusteringConfig;
  export let clusterNumber: number;
  export let clusterVisitsByTaxonUnique: Record<string, number>;
  export let locationGraphData: LocationGraphData;
  export let locationGraphDataSet: LocationGraphData[];
  export let taxonTierStats: PredictionTierStat[];
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
  const predictedPerVisitDiff = locationGraphData.predictedPerVisitDiff;
  const predictedPerPersonVisitDiff = locationGraphData.predictedPerPersonVisitDiff;
  const hasPrediction =
    predictedPerVisitDiff !== null || predictedPerPersonVisitDiff !== null;

  $: graphSpec = getGraphSpec(config, datasetType, false);
</script>

<InfoDialog
  title={locationGraphData.localityName + titleSuffix}
  classes="location_effort_dialog"
  maxWidth="976px"
  onClose={close}
>
  <div class="container-fluid location_effort_dialog">
    <div class="row justify-content-center location_stats">
      <div class="col-auto">
        Cluster <span>#{clusterNumber}</span>,
        {#if hasPrediction}
          {#if predictedPerVisitDiff !== null}
            +<span>{predictedPerVisitDiff.toFixed(1)}</span> spp. next visit{predictedPerPersonVisitDiff !==
            null
              ? ','
              : ''}
          {/if}
          {#if predictedPerPersonVisitDiff !== null}
            +<span>{predictedPerPersonVisitDiff.toFixed(1)}</span> spp. next person-visit
          {/if}
        {:else}
          no +spp. predictions available
        {/if}
      </div>
    </div>
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
        {#if hasPrediction}
          <SingleEffortGraph
            title={graphSpec.graphTitle}
            graphData={locationGraphData}
            {graphSpec}
          />
        {:else}
          <EffortGraph
            title={graphSpec.graphTitle}
            graphDataSet={[locationGraphData]}
            totalCaves={1}
            {graphSpec}
            dataPointColor="black"
            dataPointWidth={2}
          />
        {/if}
      </div>
    </div>
    <LocationFootnotes flags={locationGraphData.flags} singleCave={true} />

    <hr />
    <TaxonBarGraph
      title="Predicted additional taxa on future visits"
      visitsByTaxonUnique={missingTaxaVisitsByTaxonUnique}
      {locationGraphDataSet}
      tierStats={taxonTierStats}
    >
      This chart shows the frequency at which taxa were found on visits to the caves of
      this cluster, restricted to the taxa not yet found in the present cave. The purple
      bar for any given taxon depicts the fraction of the total number of visits in
      which the taxon was found. The left column indicates the accuracy <MoreLess
        >with which this chart predicts additional species that can be expected to be
        found at the cave, according to historical data. To determine the accuracy, the
        additional taxa found on the three most recent visits to each cave were removed,
        one cave at a time and one visit at a time, and the taxa found in the other
        caves of the cluster were used to predict the most likely next taxa of this
        cave. The more visits in which those taxa were found, the higher they appear in
        a sort of the taxa. The percentage for the top N taxa indicates the average rate
        at which each next visit to the cave yielded taxa in the top N taxa of this
        sort. <i
          >For example, a top 5 accuracy of 25% would mean that this prediction
          technique correctly predicted 25% of the taxa occurring among the next N taxa
          found in the cave.</i
        > These percentages are independent of the individual taxa and are the same for all
        caves of the cluster.</MoreLess
      >
    </TaxonBarGraph>

    <hr />
    <TaxonBarGraph
      title="Frequency of taxa found in this cave"
      visitsByTaxonUnique={locationGraphData.visitsByTaxonUnique}
      locationGraphDataSet={[locationGraphData]}
      >This chart shows all the taxa found in this cave, sorted by the number of visits
      in which they were found. It illustrates the frequency of occurrence of taxa in
      the cave rather than the frequency of occurrence of specimens. Each bar depicts
      the fraction of the total number of visits in which a taxon was found..</TaxonBarGraph
    >
  </div>
</InfoDialog>

<style lang="scss">
  :global(.location_effort_dialog) {
    margin-bottom: -0.5rem;
  }

  .location_stats {
    margin-top: -0.8rem;
    margin-bottom: 1rem;
  }
  .location_stats span {
    font-weight: bold;
  }
</style>
