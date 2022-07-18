<script lang="ts" context="module">
  import { createSessionStore } from '../../util/session_store';

  import {
    type LocationGraphData,
    toLocationGraphDataSetByCluster
  } from '../../../frontend-core/clusters/location_graph_data';
  import {
    type ClusteringConfig,
    type ClusterData,
    type PredictionTierStat,
    sortLocationGraphDataSet,
    toClusterData
  } from '../../../frontend-core/clusters/cluster_data';

  const CLUSTER_STORE_VERSION = 2;

  interface ClusterStore {
    version: number;
    config: ClusteringConfig;
    dataByCluster: ClusterData[];
  }

  const clusterStore = createSessionStore<ClusterStore | null>('clusters', null);
</script>

<script lang="ts">
  import { afterUpdate } from 'svelte';

  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import BusyMessage from '../../common/BusyMessage.svelte';
  import ConfigClustersDialog from './ConfigClustersDialog.svelte';
  import ClusterPieChart from './ClusterPieChart.svelte';
  import ClusterRadarChart from './ClusterRadarChart.svelte';
  import EffortGraph from './EffortGraph.svelte';
  import RegressedEffortGraph from './RegressedEffortGraph.svelte';
  import LocationBarGraph from './LocationBarGraph.svelte';
  import { showNotice } from '../../common/VariableNotice.svelte';
  import {
    TaxonRank,
    DissimilarityBasis,
    DissimilarityTransform,
    TaxonWeight,
    ComparedTaxa
  } from '../../../shared/model';
  import { client } from '../../stores/client';
  import { loadSeeds, sortIntoClusters, loadPoints } from '../../lib/cluster_client';
  import type { Point } from '../../../shared/point';
  import type { EffortGraphSpec } from '../../../frontend-core/clusters/effort_graph_spec';
  import { ClusterColorSet } from './cluster_color_set';
  import { pageName } from '../../stores/pageName';

  $pageName = 'Collection Effort';

  const MAX_CLUSTERS = 10;
  const PREDICTION_HISTORY_SAMPLE_DEPTH = 3;
  const PREDICTION_TIERS = 20;

  const clusterSpec = {
    comparedTaxa: ComparedTaxa.generaHavingCaveObligates,
    ignoreSubgenera: false,
    minSpecies: 0,
    maxSpecies: 10000,
    metric: {
      basis: DissimilarityBasis.diffMinusCommonTaxa,
      transform: DissimilarityTransform.none,
      highestComparedRank: TaxonRank.Genus,
      weight: TaxonWeight.equalWeighted
    }
  };

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
    visits = 'per-visit-set',
    personVisits = 'per-person-visit-set'
  }

  let clusteringRequest: ClusteringConfig | null = null;
  // @ts-ignore
  let loadState = LoadState.idle;
  let datasetID = DatasetID.personVisits;
  let clusterColors: ClusterColorSet[] = [];
  let clusterIndex = 0;
  let showingAverageModel = false;
  let getLocationValue: (locationData: LocationGraphData) => number | null;
  let getLocationPoints: (locationData: LocationGraphData) => Point[];
  let singlePointLocationDataSet: LocationGraphData[];
  let multiPointLocationDataSet: LocationGraphData[];
  let greatestSinglePointLocationValue: number;
  let greatestMultiPointLocationValue: number;
  let predictionTierStats: PredictionTierStat[];

  $: if ($clusterStore && $clusterStore.version != CLUSTER_STORE_VERSION) {
    $clusterStore = null;
  }

  $: if ($clusterStore) {
    clusterSpec.comparedTaxa = $clusterStore.config.comparedTaxa;
    clusterSpec.ignoreSubgenera = $clusterStore.config.ignoreSubgenera;
    clusterSpec.metric.highestComparedRank = $clusterStore.config.highestComparedRank;

    for (let i = 0; i < $clusterStore.dataByCluster.length; ++i) {
      clusterColors[i] = new ClusterColorSet(
        `hsl(${i * (360 / $clusterStore!.dataByCluster.length)}, 60%, 60%)`
      );
    }
  }

  $: if ($clusterStore) {
    _setClusterSelectorColor(clusterIndex); // dependent on changes to clusterIndex
    const clusterData = $clusterStore.dataByCluster[clusterIndex];

    if (datasetID == DatasetID.personVisits) {
      getLocationValue = (locationData) => locationData.predictedPerVisitDiff;
      getLocationPoints = (locationData) => locationData.perVisitPoints;
      predictionTierStats = clusterData.avgPerVisitTierStats;
    } else {
      getLocationValue = (locationData) => locationData.predictedPerPersonVisitDiff;
      getLocationPoints = (locationData) => locationData.perPersonVisitPoints;
      predictionTierStats = clusterData.avgPerPersonVisitTierStats;
    }

    const dataset = clusterData.locationGraphDataSet;
    sortLocationGraphDataSet(dataset, getLocationValue);

    const firstNonNullIndex = dataset.findIndex(
      (graphData) => getLocationValue(graphData) !== null
    );
    if (firstNonNullIndex > 0) {
      const getValue = (locationData: LocationGraphData) =>
        getLocationPoints(locationData)[0].y;
      singlePointLocationDataSet = dataset.slice(0, firstNonNullIndex);
      multiPointLocationDataSet = dataset.slice(firstNonNullIndex);
      sortLocationGraphDataSet(singlePointLocationDataSet, getValue);
      greatestSinglePointLocationValue = getValue(singlePointLocationDataSet[0]);
    } else {
      singlePointLocationDataSet = [];
      multiPointLocationDataSet = dataset;
    }
    if (multiPointLocationDataSet.length > 0) {
      greatestMultiPointLocationValue = getLocationValue(multiPointLocationDataSet[0])!;
    }

    // TBD: temporarily limit data shown
    singlePointLocationDataSet = singlePointLocationDataSet.slice(0, 10);
    console.log('**** single length', singlePointLocationDataSet.length);
    multiPointLocationDataSet = multiPointLocationDataSet.slice(0, 30);
    console.log('**** multi length', multiPointLocationDataSet.length);
    console.log('**** multi', multiPointLocationDataSet);

    loadState = LoadState.ready;
  }

  function _clearData() {
    clusterStore.set(null);
    $clusterStore = null;
  }

  function _getGraphSpec(datasetID: DatasetID, forModel: boolean): EffortGraphSpec {
    // datasetID is passed in to get reactivity in the HTML

    let graphTitle: string;
    let xAxisLabel: string;
    let maxPointCount = Infinity;
    let pointExtractor: (graphData: LocationGraphData) => Point[];

    if (datasetID == DatasetID.visits) {
      if (forModel) {
        graphTitle = 'Avg. model of cumulative species across visits';
        xAxisLabel = 'visits in regressed range';
        maxPointCount = $clusterStore!.config.maxPointsToRegress || Infinity;
      } else {
        graphTitle = 'Cumulative species across visits';
        xAxisLabel = 'visits';
      }
      pointExtractor = (graphData) => graphData.perVisitPoints;
    } else {
      if (forModel) {
        graphTitle = 'Avg. model of cumulative species across person-visits';
        xAxisLabel = 'person-visits in regressed range';
        maxPointCount = $clusterStore!.config.maxPointsToRegress || Infinity;
      } else {
        graphTitle = 'Cumulative species across person-visits';
        xAxisLabel = 'person-visits';
      }
      pointExtractor = (graphData) => graphData.perPersonVisitPoints;
    }
    return {
      graphTitle,
      xAxisLabel,
      pointSliceSpec: {
        minPointCount: 0,
        maxPointCount,
        recentPointsToIgnore: 0
      },
      pointExtractor
    };
  }

  async function _loadData(config: ClusteringConfig) {
    clusterStore.set(null);

    clusterSpec.comparedTaxa = config.comparedTaxa;
    clusterSpec.ignoreSubgenera = config.ignoreSubgenera;
    clusterSpec.metric.highestComparedRank = config.highestComparedRank;

    try {
      // Configure and load the data.

      loadState = LoadState.determiningSeeds;
      const seedLocations = await loadSeeds($client, clusterSpec, config.maxClusters);

      loadState = LoadState.sortingIntoClusters;
      const taxaClusters = await sortIntoClusters($client, clusterSpec, seedLocations);

      loadState = LoadState.loadingPoints;
      const rawClientEffortSetByCluster = await loadPoints(
        $client,
        config.comparedTaxa,
        taxaClusters
      );
      const locationGraphDataSetByCluster = toLocationGraphDataSetByCluster(
        rawClientEffortSetByCluster
      );

      // Process the loaded data.

      loadState = LoadState.generatingPlotData;
      const dataByCluster: ClusterData[] = [];
      for (let i = 0; i < taxaClusters.length; ++i) {
        dataByCluster.push(
          toClusterData(
            config,
            taxaClusters[i].visitsByTaxonUnique,
            locationGraphDataSetByCluster[i]
          )
        );
      }
      dataByCluster.sort((a, b) => {
        const aTaxaCount = Object.keys(a.visitsByTaxonUnique).length;
        const bTaxaCount = Object.keys(b.visitsByTaxonUnique).length;
        if (aTaxaCount == bTaxaCount) return 0;
        return bTaxaCount - aTaxaCount; // sort most taxa first
      });
      clusterStore.set({
        version: CLUSTER_STORE_VERSION,
        config,
        dataByCluster
      });

      loadState = LoadState.ready;
    } catch (err: any) {
      showNotice({ message: err.message });
    }
  }

  function _openConfigDialog() {
    // Setting clusteringRequest opens dialog.
    if ($clusterStore) {
      clusteringRequest = $clusterStore.config;
    } else {
      clusteringRequest = {
        maxClusters: MAX_CLUSTERS,
        comparedTaxa: ComparedTaxa.generaHavingCaveObligates,
        ignoreSubgenera: false,
        highestComparedRank: TaxonRank.Genus,
        maxPointsToRegress: 12,
        predictionHistorySampleDepth: PREDICTION_HISTORY_SAMPLE_DEPTH,
        maxPredictionTiers: PREDICTION_TIERS
      };
    }
  }

  function _onCloseConfigDialog() {
    clusteringRequest = null;
  }

  function _onSubmitConfigDialog(config: ClusteringConfig) {
    _loadData(config); // don't wait, so we can close dialog
    clusteringRequest = null;
    clusterIndex = 0;
  }

  function _setClusterSelectorColor(clusterIndex: number) {
    const clusterColor = document.getElementById('cluster_color');
    const clusterSelector = document.getElementById('cluster_selector');
    if (clusterSelector) {
      const foreground = clusterColors[clusterIndex].foreground;
      const background = clusterColors[clusterIndex].lightBackground;
      clusterColor!.style.backgroundColor = foreground;
      clusterSelector.style.borderColor = foreground;
      clusterSelector.style.backgroundColor = background;
    }
  }

  function _toggleModel() {
    showingAverageModel = !showingAverageModel;
  }

  afterUpdate(() => _setClusterSelectorColor(clusterIndex));
</script>

<DataTabRoute activeTab="Effort">
  <div class="container-fluid mb-3">
    <TabHeader title={$pageName}>
      <span slot="main-buttons">
        {#if $clusterStore}
          <button class="btn btn-minor" type="button" on:click={_clearData}
            >Clear</button
          >
        {/if}
        <button class="btn btn-major" type="button" on:click={_openConfigDialog}
          >{$clusterStore ? 'Change' : 'Load'} Data</button
        >
      </span>
    </TabHeader>

    {#if $clusterStore}
      <div class="cluster_summary_info">
        <div class="row mt-3">
          <div class="col">
            <span>{$clusterStore.config.maxClusters} clusters max</span>
          </div>
          <div class="col">comparing: <span>{clusterSpec.comparedTaxa}</span></div>
          <div class="col" />
        </div>
        <div class="row">
          <div class="col"><span>{clusterSpec.metric.basis}</span></div>
          <div class="col">
            highest comparison: <span>{clusterSpec.metric.highestComparedRank}</span>
          </div>
          <div class="col" />
        </div>
        <div class="row">
          <div class="col">
            subgenera:
            <span>{clusterSpec.ignoreSubgenera ? 'ignoring' : 'heeding'}</span>
          </div>
          <div class="col">
            <span
              >{clusterSpec.minSpecies} &lt;= species &lt;=
              {clusterSpec.maxSpecies}</span
            >
          </div>
          <div class="col" />
        </div>
        <div class="row">
          <div class="col">
            metric transform: <span>{clusterSpec.metric.transform}</span>
          </div>
          <div class="col" />
          <div class="col" />
        </div>
        <div class="row">
          <div class="col">
            metric weight: <span>{clusterSpec.metric.weight}</span>
          </div>
          <div class="col" />
          <div class="col" />
        </div>
      </div>

      <div class="row justify-content-center">
        <div class="col" style="max-width: 460px">
          <ClusterRadarChart
            dataByCluster={$clusterStore.dataByCluster}
            {clusterColors}
          />
        </div>
        <div class="col d-flex align-items-center" style="max-width: 300px">
          <ClusterPieChart
            dataByCluster={$clusterStore.dataByCluster}
            {clusterColors}
          />
        </div>
      </div>

      <div class="row justify-content-between mt-4 ms-4 me-4">
        <div class="col-auto d-flex align-items-center">
          <div class="form-group">
            <div class="input-group">
              <select
                id="cluster_selector"
                class="form-select form-select-sm item_select me-1"
                bind:value={clusterIndex}
              >
                {#each $clusterStore.dataByCluster as _, i}
                  <option value={i}>Cluster #{i + 1}</option>
                {/each}
              </select>
              <div id="cluster_color" />
            </div>
          </div>
        </div>
        <div class="col-auto">
          <div class="btn-group" role="group" aria-label="Switch datasets">
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
        </div>
        <div class="col-auto">
          <button class="btn btn-major" type="button" on:click={_toggleModel}
            >{showingAverageModel ? 'Hide Avg. Model' : 'Show Avg. Model'}</button
          >
        </div>
      </div>

      {@const clusterData = $clusterStore.dataByCluster[clusterIndex]}
      {@const clusterColor = clusterColors[clusterIndex].foreground}
      {@const multipleClusters =
        $clusterStore && $clusterStore.dataByCluster.length > 1}
      {@const graphTitlePrefix = multipleClusters ? `#${clusterIndex + 1}: ` : ''}

      {#if !showingAverageModel}
        {@const graphSpec = _getGraphSpec(datasetID, false)}
        <div class="row mt-3 mb-1">
          <div class="col" style="height: 350px">
            <EffortGraph
              title={graphTitlePrefix + graphSpec.graphTitle}
              color={clusterColor}
              graphDataSet={clusterData.locationGraphDataSet}
              {graphSpec}
            />
          </div>
        </div>
      {:else}
        {@const graphSpec = _getGraphSpec(datasetID, true)}
        <RegressedEffortGraph
          title={graphTitlePrefix + graphSpec.graphTitle}
          color={clusterColor}
          sourceDataSet={clusterData.locationGraphDataSet}
          {graphSpec}
          clusteringConfig={$clusterStore.config}
        />
      {/if}

      {#if singlePointLocationDataSet.length > 0}
        <h2>Single point locations</h2>
        <LocationBarGraph
          dataset={singlePointLocationDataSet}
          greatestValue={greatestSinglePointLocationValue}
          getValue={getLocationValue}
          getPoints={getLocationPoints}
        />
      {/if}
      {#if multiPointLocationDataSet.length > 0}
        <h2>Multi point locations</h2>
        <LocationBarGraph
          tierStats={predictionTierStats}
          dataset={multiPointLocationDataSet}
          greatestValue={greatestMultiPointLocationValue}
          getValue={getLocationValue}
          getPoints={getLocationPoints}
        />
      {/if}
    {/if}
  </div>
</DataTabRoute>

{#if clusteringRequest !== null}
  <ConfigClustersDialog
    config={clusteringRequest}
    close={_onCloseConfigDialog}
    submit={_onSubmitConfigDialog}
  />
{/if}

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

<style lang="scss">
  .cluster_summary_info {
    font-size: 0.85rem;
    color: #999;
  }
  .cluster_summary_info span {
    color: #000;
  }

  #cluster_selector {
    display: inline-block;
  }
  #cluster_color {
    display: inline-block;
    width: 1.3rem;
  }
</style>
