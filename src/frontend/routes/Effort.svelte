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
    Point,
    PlottableModel,
    LogXModel,
    Order3XModel,
    QuadraticXModel,
    PowerXModel,
    LogYModel,
    PowerYModel,
    BoxCoxYModel,
    shortenPValue,
    shortenRMSE,
    shortenR2
  } from '../lib/linear_regression';
  import { type ModelSummary, summarizeModels } from '../lib/model_summary';
  import { pageName } from '../stores/pageName';

  $pageName = 'Collection Effort';

  enum YAxisType {
    totalSpecies = 'total species',
    percentChange = 'percent change',
    cumuPercentChange = 'cumulative percent change'
  }

  enum YAxisModel {
    none = 'y',
    logY = 'log(y)',
    powerY = 'y^p',
    boxCox = 'box-cox'
  }

  const yAxisType = YAxisType.totalSpecies;
  const yAxisModel = YAxisModel.none;
  const MAX_CLUSTERS = 12;
  const MIN_PERSON_VISITS = 0;
  const LOWER_BOUND_X = 0;
  const UPPER_BOUND_X = Infinity;
  const POINTS_IN_MODEL_PLOT = 200;

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
  const PLOTTED_COMPARED_TAXA = CLUSTER_SPEC.comparedTaxa!;

  const MIN_POINTS_TO_REGRESS = 3;
  const LOG_HEXCOLOR = 'A95CFF';
  const ORDER3_HEXCOLOR = '00D40E';
  const POWER_HEXCOLOR = 'FF0088';
  const QUADRATIC_HEXCOLOR = '00DCD8';

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
  let modelSummaries: ModelSummary[] = [];
  let localityCountByCluster: number[] = [];

  $: if ($clusterStore) {
    loadState = LoadState.fittingModels;
    modelsByCluster = [];

    for (let i = 0; i < $clusterStore.length; ++i) {
      const clusterData = $clusterStore[i];
      const graphData = _getGraphData(datasetID, clusterData);
      let models: PlottableModel[] = [];
      if (graphData.points.length >= MIN_POINTS_TO_REGRESS) {
        models = _generateModels(yAxisModel, graphData.points);
      }
      modelsByCluster[i] = models; // must place by cluster index
      localityCountByCluster[i] = clusterData.locationCount;
    }
    modelSummaries = summarizeModels(modelsByCluster, localityCountByCluster);
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
        PLOTTED_COMPARED_TAXA,
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

  function _generateModels(yAxisModel: YAxisModel, points: Point[]) {
    const models: PlottableModel[] = [];
    const modelFactories: ((
      dataPoints: Point[],
      yTransform: (y: number) => number
    ) => PlottableModel)[] = [];

    modelFactories.push((dataPoints, yTransform) => {
      return new PowerXModel(POWER_HEXCOLOR, dataPoints, yTransform);
    });
    modelFactories.push((dataPoints, yTransform) => {
      return new LogXModel(LOG_HEXCOLOR, dataPoints, yTransform);
    });
    modelFactories.push((dataPoints, yTransform) => {
      return new QuadraticXModel(QUADRATIC_HEXCOLOR, dataPoints, yTransform);
    });
    modelFactories.push((dataPoints, yTransform) => {
      return new Order3XModel(ORDER3_HEXCOLOR, dataPoints, yTransform);
    });

    switch (yAxisModel) {
      case YAxisModel.none:
        models.push(new PowerXModel(POWER_HEXCOLOR, points));
        models.push(new LogXModel(LOG_HEXCOLOR, points));
        models.push(new QuadraticXModel(QUADRATIC_HEXCOLOR, points));
        models.push(new Order3XModel(ORDER3_HEXCOLOR, points));
        break;
      case YAxisModel.logY:
        for (const modelFactory of modelFactories) {
          models.push(new LogYModel(points, modelFactory));
        }
        break;
      case YAxisModel.powerY:
        for (const modelFactory of modelFactories) {
          models.push(new PowerYModel(points, modelFactory));
        }
        break;
      case YAxisModel.boxCox:
        for (const modelFactory of modelFactories) {
          models.push(new BoxCoxYModel(points, modelFactory));
        }
        break;
    }
    return models;
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
      <div class="cluster_summary_info">
        <div class="row mt-3">
          <div class="col"><span>{MAX_CLUSTERS} clusters max</span></div>
          <div class="col">comparing: <span>{CLUSTER_SPEC.comparedTaxa}</span></div>
          <div class="col">y-axis: <span>{yAxisType} {yAxisModel}</span></div>
        </div>
        <div class="row">
          <div class="col"><span>{CLUSTER_SPEC.metric.basis}</span></div>
          <div class="col">
            subgenera:
            <span>{CLUSTER_SPEC.ignoreSubgenera ? 'ignoring' : 'heeding'}</span>
          </div>
          <div class="col">
            regressed <span>{LOWER_BOUND_X} &lt;= x &lt;= {UPPER_BOUND_X}</span>
          </div>
        </div>
        <div class="row">
          <div class="col">
            metric transform: <span>{CLUSTER_SPEC.metric.transform}</span>
          </div>
          <div class="col">
            min <span>{CLUSTER_SPEC.minSpecies}</span> max
            <span>{CLUSTER_SPEC.maxSpecies}</span> species
          </div>
          <div class="col">min. x graphed: <span>{MIN_PERSON_VISITS}</span></div>
        </div>
        <div class="row">
          <div class="col">
            metric weight: <span>{CLUSTER_SPEC.metric.weight}</span>
          </div>
          <div class="col">plotting <span>{PLOTTED_COMPARED_TAXA}</span></div>
          <div class="col" />
        </div>
      </div>

      <div class="model_summary_info">
        <div class="row mt-3">
          <div class="col-4 text-center">best/avg/avg-per-cave</div>
          <div class="col"><span>p-value</span></div>
          <div class="col"><span>RMSE</span></div>
          <div class="col"><span>R2</span></div>
        </div>
        {#each modelSummaries as summary}
          <div class="row">
            <div class="col-4"><span>{summary.modelName}</span></div>
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
