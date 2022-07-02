<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';

  import { type EffortData, toEffortDataSetByCluster } from '../lib/effort_data';
  import {
    YAxisModel,
    type ModelFactory,
    type PerLocationClusterData,
    toPerLocationClusterData,
    toPerLocationModels
  } from '../lib/cluster_data';
  const effortStore = createSessionStore<EffortData[][] | null>('effort_data', null);
  const clusterStore = createSessionStore<PerLocationClusterData[] | null>(
    'cluster_data',
    null
  );
</script>

<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import BusyMessage from '../common/BusyMessage.svelte';
  import ModelStats from '../components/ModelStats.svelte';
  import EffortGraph from '../components/EffortGraph.svelte';
  import ResidualsPlot from '../components/ResidualsPlot.svelte';
  import { showNotice } from '../common/VariableNotice.svelte';
  import {
    ClusterSpec,
    DissimilarityBasis,
    DissimilarityTransform,
    TaxonWeight,
    ComparedTaxa
  } from '../../shared/model';
  import { client } from '../stores/client';
  import { loadSeeds, sortIntoClusters, loadPoints } from '../lib/cluster_client';
  import { shortenPValue, shortenRMSE, shortenR2 } from '../lib/regression';
  import { PlottableModel, LinearXModel, PowerXModel } from '../lib/plottable_model';
  import { YAxisType } from '../lib/effort_graphs';
  import { type ModelSummary, summarizeModels } from '../lib/model_summary';
  import { pageName } from '../stores/pageName';

  $pageName = 'Collection Effort';

  const yAxisType = YAxisType.totalSpecies;
  const yAxisModel = YAxisModel.none;
  const USE_ZERO_Y_BASELINE = false;
  const MAX_CLUSTERS = 12;
  const MIN_PERSON_VISITS = 0;
  const LOWER_BOUND_X = 0;
  const UPPER_BOUND_X = Infinity;
  const MIN_UNCHANGED_Y = 0;
  const MIN_CAVES_PER_SUMMARY = 10;
  const MIN_POINTS_PER_SUMMARY = 50;

  const CLUSTER_SPEC: ClusterSpec = {
    comparedTaxa: ComparedTaxa.all,
    ignoreSubgenera: false,
    minSpecies: 0,
    maxSpecies: 10000,
    metric: {
      basis: DissimilarityBasis.diffMinusCommonTaxa,
      transform: DissimilarityTransform.none,
      weight: TaxonWeight.weighted
    }
  };
  const PLOTTED_COMPARED_TAXA = ComparedTaxa.all;

  const PINK_HEXCOLOR = 'FF0088';
  const AQUA_HEXCOLOR = '00DCD8';

  enum LoadState {
    idle,
    determiningSeeds,
    sortingIntoClusters,
    loadingPoints,
    fittingModels,
    generatingPlotData,
    ready
  }

  enum DatasetID {
    days = 'days',
    visits = 'per-visit-set',
    personVisits = 'per-person-visit-set'
  }

  const modelFactories: ModelFactory[] = [];
  modelFactories.push((dataPoints, yTransform) => {
    return new PowerXModel(PINK_HEXCOLOR, dataPoints, yTransform);
  });
  modelFactories.push((dataPoints, yTransform) => {
    return new LinearXModel(AQUA_HEXCOLOR, dataPoints, yTransform);
  });

  let loadState = LoadState.idle;
  let datasetID = DatasetID.personVisits;
  let modelsByCluster: PlottableModel[][] = [];
  let modelSummaries: ModelSummary[] = [];
  let localityCountByCluster: number[] = [];

  $: if ($clusterStore) {
    loadState = LoadState.fittingModels;
    modelsByCluster = [];

    for (let i = 0; i < $clusterStore.length; ++i) {
      const clusterData = $clusterStore[i];
      const graphData = _getGraphData(datasetID, clusterData);
      let models = toPerLocationModels(modelFactories, yAxisModel, graphData);

      modelsByCluster[i] = models; // must place by cluster index
      localityCountByCluster[i] = clusterData.locationCount;
    }
    modelSummaries = summarizeModels(
      MIN_CAVES_PER_SUMMARY,
      MIN_POINTS_PER_SUMMARY,
      modelsByCluster,
      localityCountByCluster
    );
  }

  async function loadData() {
    try {
      // Configure and load the data.

      loadState = LoadState.determiningSeeds;
      const seedLocations = await loadSeeds($client, CLUSTER_SPEC, MAX_CLUSTERS);

      loadState = LoadState.sortingIntoClusters;
      const locationIDsByClusterIndex = await sortIntoClusters(
        $client,
        CLUSTER_SPEC,
        seedLocations
      );

      loadState = LoadState.loadingPoints;
      const rawEffortDataSetByCluster = await loadPoints(
        $client,
        PLOTTED_COMPARED_TAXA,
        locationIDsByClusterIndex
      );
      const effortDataSetByCluster = toEffortDataSetByCluster(
        rawEffortDataSetByCluster,
        MIN_PERSON_VISITS
      );
      effortStore.set(effortDataSetByCluster);

      // Process the loaded data.

      loadState = LoadState.generatingPlotData;
      const clusterDataByCluster: PerLocationClusterData[] = [];
      for (const effortDataSet of effortDataSetByCluster) {
        clusterDataByCluster.push(
          toPerLocationClusterData(
            yAxisType,
            effortDataSet,
            LOWER_BOUND_X,
            UPPER_BOUND_X,
            MIN_UNCHANGED_Y,
            USE_ZERO_Y_BASELINE
          )
        );
      }
      clusterDataByCluster.sort((a, b) => {
        const aPointCount = a.perPersonVisitTotalsGraphs.pointCount;
        const bPointCount = b.perPersonVisitTotalsGraphs.pointCount;
        if (aPointCount == bPointCount) return 0;
        return bPointCount - aPointCount; // sort most points first
      });

      clusterStore.set(clusterDataByCluster);
      loadState = LoadState.ready;
    } catch (err: any) {
      showNotice({ message: err.message });
    }
  }

  function clearData() {
    effortStore.set(null);
    clusterStore.set(null);
    location.reload();
  }

  function _getGraphData(datasetID: DatasetID, clusterData: PerLocationClusterData) {
    // datasetID is passed in to get reactivity in the HTML
    switch (datasetID) {
      case DatasetID.days:
        return clusterData.perDayTotalsGraphs;
      case DatasetID.visits:
        return clusterData.perVisitTotalsGraphs;
      case DatasetID.personVisits:
        return clusterData.perPersonVisitTotalsGraphs;
    }
  }
</script>

<DataTabRoute activeTab="Effort">
  <div class="container-fluid mb-3">
    <TabHeader title={$pageName}>
      <span slot="main-buttons">
        {#if $clusterStore != null}
          <button class="btn btn-minor" type="button" on:click={clearData}
            >Clear Data</button
          >
        {/if}
      </span>
      <span slot="work-buttons">
        {#if $clusterStore}
          <div class="btn-group" role="group" aria-label="Switch datasets">
            <input
              type="radio"
              class="btn-check"
              bind:group={datasetID}
              name="dataset"
              id={DatasetID.days}
              value={DatasetID.days}
            />
            <label class="btn btn-outline-primary" for={DatasetID.days}>Days</label>
            <input
              type="radio"
              class="btn-check"
              bind:group={datasetID}
              name="dataset"
              id={DatasetID.visits}
              value={DatasetID.visits}
            />
            <label class="btn btn-outline-primary" for={DatasetID.visits}>Visits</label>
            <input
              type="radio"
              class="btn-check"
              bind:group={datasetID}
              name="dataset"
              id={DatasetID.personVisits}
              value={DatasetID.personVisits}
            />
            <label class="btn btn-outline-primary" for={DatasetID.personVisits}
              >Person-Visits</label
            >
          </div>
        {/if}
      </span>
    </TabHeader>

    {#if $clusterStore === null}
      <button class="btn btn-major" type="button" on:click={loadData}>Load Data</button>
    {:else}
      <div class="cluster_summary_info">
        <div class="row mt-3">
          <div class="col"><span>{MAX_CLUSTERS} clusters max</span></div>
          <div class="col">comparing: <span>{CLUSTER_SPEC.comparedTaxa}</span></div>
          <div class="col"><span>{yAxisModel}</span>: <span>{yAxisType}</span></div>
        </div>
        <div class="row">
          <div class="col"><span>{CLUSTER_SPEC.metric.basis}</span></div>
          <div class="col">
            subgenera:
            <span>{CLUSTER_SPEC.ignoreSubgenera ? 'ignoring' : 'heeding'}</span>
          </div>
          <div class="col">
            regressed: <span
              >{LOWER_BOUND_X} &lt;= x &lt;= {@html UPPER_BOUND_X == Infinity
                ? '&infin;'
                : UPPER_BOUND_X}</span
            >
          </div>
        </div>
        <div class="row">
          <div class="col">
            metric transform: <span>{CLUSTER_SPEC.metric.transform}</span>
          </div>
          <div class="col">
            <span
              >{CLUSTER_SPEC.minSpecies} &lt;= species &lt;=
              {CLUSTER_SPEC.maxSpecies}</span
            >
          </div>
          <div class="col">min. x graphed: <span>{MIN_PERSON_VISITS}</span></div>
        </div>
        <div class="row">
          <div class="col">
            metric weight: <span>{CLUSTER_SPEC.metric.weight}</span>
          </div>
          <div class="col">plotting: <span>{PLOTTED_COMPARED_TAXA}</span></div>
          <div class="col">
            min. caves<span>/</span>pts/sum:
            <span>{MIN_CAVES_PER_SUMMARY}/{MIN_POINTS_PER_SUMMARY}</span>
          </div>
        </div>
        <div class="row">
          <div class="col" />
          <div class="col" />
          <div class="col">
            min. unchanged y: <span>{MIN_UNCHANGED_Y}</span>
          </div>
        </div>
      </div>

      <div class="model_summary_info">
        <div class="row mt-3">
          <div class="col-3 text-center">best/avg/weighted-avg</div>
          <div class="col"><span>p-value</span></div>
          <div class="col"><span>RMSE</span></div>
          <div class="col"><span>R2</span></div>
        </div>
        {#each modelSummaries as summary}
          <div class="row">
            <div class="col-3"><span>{summary.modelName}</span></div>
            <div class="col">
              {shortenPValue(summary.bestPValue)}<span>/</span>{shortenPValue(
                summary.averagePValue
              )}<span>/</span>{shortenPValue(summary.weightedPValue)}
            </div>
            <div class="col">
              {shortenRMSE(summary.bestRMSE)}<span>/</span>{shortenRMSE(
                summary.averageRMSE
              )}<span>/</span>{shortenRMSE(summary.weightedRMSE)}
            </div>
            <div class="col">
              {shortenR2(summary.bestR2)}<span>/</span>{shortenR2(
                summary.averageR2
              )}<span>/</span>{shortenR2(summary.weightedR2)}
            </div>
          </div>
        {/each}
      </div>

      {#each $clusterStore as clusterData, i}
        {@const multipleClusters = $clusterStore && $clusterStore.length > 1}
        {@const sizedEffortGraphSpec = _getGraphData(datasetID, clusterData)}
        {@const models = modelsByCluster[i]}
        {@const graphTitle =
          (multipleClusters ? `#${i + 1}: ` : '') +
          sizedEffortGraphSpec.graphSpecs[0].graphTitle +
          ` (${clusterData.locationCount} caves)`}
        {#if models.length > 0}
          <div class="row mt-3 mb-1">
            <div class="col" style="height: 350px">
              <EffortGraph
                title={graphTitle}
                config={sizedEffortGraphSpec}
                {models}
                yFormula={models ? models[0].getYFormula() : 'y'}
              />
            </div>
          </div>
          <div class="row mb-3 gx-0 ms-4">
            {#each models as model}
              <div class="col-sm-6"><ResidualsPlot {model} /></div>
            {/each}
          </div>
          {#each models as model}
            <ModelStats {model} />
          {/each}
        {:else}
          <div class="row mt-3 mb-1">
            <div class="col" style="height: 350px">
              <EffortGraph title={graphTitle} config={sizedEffortGraphSpec} />
            </div>
          </div>
          <div class="row mb-3 gx-0 ms-4">
            <div class="col-sm-6">Too few points to perform a regression.</div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</DataTabRoute>

{#if $clusterStore === null}
  {#if loadState == LoadState.determiningSeeds}
    <BusyMessage message="Determining seed locations..." />
  {:else if loadState == LoadState.sortingIntoClusters}
    <BusyMessage message="Sorting into clusters..." />
  {:else if loadState == LoadState.loadingPoints}
    <BusyMessage message="Loading points..." />
  {:else if loadState == LoadState.generatingPlotData}
    <BusyMessage message="Generating plot data..." />
  {:else if loadState == LoadState.fittingModels}
    <BusyMessage message="Fitting models..." />
  {/if}
{/if}

<style>
  .cluster_summary_info {
    font-size: 0.85rem;
    color: #999;
  }
  .cluster_summary_info span {
    color: #000;
  }

  .model_summary_info {
    font-size: 0.85rem;
    color: #000;
  }
  .model_summary_info span {
    color: #999;
  }
  .model_summary_info .row > div + div {
    text-align: center;
  }
</style>
