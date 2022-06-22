<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';

  import { EffortData, loadSeeds, sortClusters, loadPoints } from '../lib/effort_data';
  import {
    type EffortGraphSpec,
    SpeciesByDaysGraphSpec,
    PercentChangeByDaysGraphSpec,
    CumuPercentChangeByDaysGraphSpec,
    SpeciesByVisitsGraphSpec,
    PercentChangeByVisitsGraphSpec,
    CumuPercentChangeByVisitsGraphSpec,
    SpeciesByPersonVisitsGraphSpec,
    PercentChangeByPersonVisitsGraphSpec,
    CumuPercentChangeByPersonVisitsGraphSpec
  } from '../lib/effort_graphs';

  interface ClusterData {
    locationCount: number;
    perDayTotalsGraph: EffortGraphSpec;
    perVisitTotalsGraph: EffortGraphSpec;
    perPersonVisitTotalsGraph: EffortGraphSpec;
  }

  const effortStore = createSessionStore<EffortData[][] | null>('effort_data', null);
  const clusterStore = createSessionStore<ClusterData[] | null>('cluster_data', null);
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
  import {
    PlottableModel,
    QuadraticModel,
    PowerModel,
    BoxCoxModel
  } from '../lib/linear_regression';
  import { pageName } from '../stores/pageName';

  $pageName = 'Collection Effort';

  enum YAxisType {
    totalSpecies = 'total species',
    percentChange = 'percent change',
    cumuPercentChange = 'cumulative percent change'
  }

  const yAxisType = YAxisType.totalSpecies;
  const MAX_CLUSTERS = 12;
  const MIN_POINTS_TO_REGRESS = 3;
  const MIN_PERSON_VISITS = 0;
  const LOWER_BOUND_X = 0;
  const UPPER_BOUND_X = Infinity;
  const POINTS_IN_MODEL_PLOT = 200;
  const USE_BOX_COX = false;

  const POWER_HEXCOLOR = 'FF0088';
  const QUADRATIC_HEXCOLOR = '00DCD8';

  const CLUSTER_SPEC: ClusterSpec = {
    metric: {
      basis: DissimilarityBasis.diffMinusCommonTaxa,
      transform: DissimilarityTransform.none,
      weight: TaxonWeight.weighted
    },
    comparedTaxa: ComparedTaxa.all,
    ignoreSubgenera: false,
    minSpecies: 0,
    maxSpecies: 10000
  };

  enum LoadState {
    idle,
    determiningSeeds,
    sortingClusters,
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

  let loadState = LoadState.idle;
  let datasetID = DatasetID.personVisits;
  let modelsByCluster: PlottableModel[][] = [];

  $: if ($clusterStore) {
    loadState = LoadState.fittingModels;
    modelsByCluster = [];
    for (let i = 0; i < $clusterStore.length; ++i) {
      const clusterData = $clusterStore[i];
      const graphData = _getGraphData(datasetID, clusterData);
      const models: PlottableModel[] = [];
      if (graphData.points.length >= MIN_POINTS_TO_REGRESS) {
        if (USE_BOX_COX) {
          models.push(
            new BoxCoxModel(graphData.points, (dataPoints, yTransform) => {
              return new PowerModel(POWER_HEXCOLOR, dataPoints, yTransform);
            })
          );
          models.push(
            new BoxCoxModel(graphData.points, (dataPoints, yTransform) => {
              return new QuadraticModel(QUADRATIC_HEXCOLOR, dataPoints, yTransform);
            })
          );
        } else {
          models.push(new PowerModel(POWER_HEXCOLOR, graphData.points));
          models.push(new QuadraticModel(QUADRATIC_HEXCOLOR, graphData.points));
        }
      }
      modelsByCluster[i] = models; // must place by cluster index
    }
  }

  async function loadData() {
    try {
      // Configure and load the data.

      loadState = LoadState.determiningSeeds;
      const seedLocations = await loadSeeds($client, CLUSTER_SPEC, MAX_CLUSTERS);

      loadState = LoadState.sortingClusters;
      const locationIDsByClusterIndex = await sortClusters(
        $client,
        CLUSTER_SPEC,
        seedLocations
      );

      loadState = LoadState.loadingPoints;
      const effortDataByCluster = await loadPoints(
        $client,
        CLUSTER_SPEC.comparedTaxa!,
        locationIDsByClusterIndex,
        MIN_PERSON_VISITS
      );
      effortStore.set(effortDataByCluster);

      // Process the loaded data.

      loadState = LoadState.generatingPlotData;
      const clusterDataByCluster: ClusterData[] = [];
      for (const effortData of effortDataByCluster) {
        clusterDataByCluster.push(_getClusterData(yAxisType, effortData));
      }
      clusterDataByCluster.sort((a, b) => {
        const aPointCount = a.perVisitTotalsGraph.points.length;
        const bPointCount = b.perVisitTotalsGraph.points.length;
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

  function _getClusterData(
    yAxisType: YAxisType,
    effortData: EffortData[]
  ): ClusterData {
    switch (yAxisType) {
      case YAxisType.totalSpecies:
        return {
          locationCount: effortData.length,
          perDayTotalsGraph: new SpeciesByDaysGraphSpec(
            effortData,
            LOWER_BOUND_X,
            UPPER_BOUND_X
          ),
          perVisitTotalsGraph: new SpeciesByVisitsGraphSpec(
            effortData,
            LOWER_BOUND_X,
            UPPER_BOUND_X
          ),
          perPersonVisitTotalsGraph: new SpeciesByPersonVisitsGraphSpec(
            effortData,
            LOWER_BOUND_X,
            UPPER_BOUND_X
          )
        };
        break;
      case YAxisType.percentChange:
        return {
          locationCount: effortData.length,
          perDayTotalsGraph: new PercentChangeByDaysGraphSpec(
            effortData,
            LOWER_BOUND_X,
            UPPER_BOUND_X
          ),
          perVisitTotalsGraph: new PercentChangeByVisitsGraphSpec(
            effortData,
            LOWER_BOUND_X,
            UPPER_BOUND_X
          ),
          perPersonVisitTotalsGraph: new PercentChangeByPersonVisitsGraphSpec(
            effortData,
            LOWER_BOUND_X,
            UPPER_BOUND_X
          )
        };
        break;
      case YAxisType.cumuPercentChange:
        return {
          locationCount: effortData.length,
          perDayTotalsGraph: new CumuPercentChangeByDaysGraphSpec(
            effortData,
            LOWER_BOUND_X,
            UPPER_BOUND_X
          ),
          perVisitTotalsGraph: new CumuPercentChangeByVisitsGraphSpec(
            effortData,
            LOWER_BOUND_X,
            UPPER_BOUND_X
          ),
          perPersonVisitTotalsGraph: new CumuPercentChangeByPersonVisitsGraphSpec(
            effortData,
            LOWER_BOUND_X,
            UPPER_BOUND_X
          )
        };
        break;
    }
  }

  function _getGraphData(datasetID: DatasetID, clusterData: ClusterData) {
    // datasetID is passed in to get reactivity in the HTML
    switch (datasetID) {
      case DatasetID.days:
        return clusterData.perDayTotalsGraph;
      case DatasetID.visits:
        return clusterData.perVisitTotalsGraph;
      case DatasetID.personVisits:
        return clusterData.perPersonVisitTotalsGraph;
    }
  }
</script>

<DataTabRoute activeTab="Effort">
  <div class="container-fluid">
    <TabHeader title={$pageName} instructions="Instructions TBD">
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
      {#each $clusterStore as clusterData, i}
        {@const multipleClusters = $clusterStore && $clusterStore.length > 1}
        {@const models = modelsByCluster[i]}
        {@const graphData = _getGraphData(datasetID, clusterData)}
        {@const graphTitle =
          (multipleClusters ? `#${i + 1}: ` : '') + graphData.graphTitle}
        {#if graphData.points.length >= MIN_POINTS_TO_REGRESS}
          <div class="row mt-3 mb-1">
            <div class="col" style="height: 350px">
              <EffortGraph
                title={graphTitle}
                config={graphData}
                {models}
                modelPlots={models.map((model) =>
                  model.getModelPoints(POINTS_IN_MODEL_PLOT)
                )}
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
              <EffortGraph title={graphTitle} config={graphData} />
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
  {:else if loadState == LoadState.sortingClusters}
    <BusyMessage message="Sorting clusters..." />
  {:else if loadState == LoadState.loadingPoints}
    <BusyMessage message="Loading points..." />
  {:else if loadState == LoadState.generatingPlotData}
    <BusyMessage message="Generating plot data..." />
  {:else if loadState == LoadState.fittingModels}
    <BusyMessage message="Fitting models..." />
  {/if}
{/if}
