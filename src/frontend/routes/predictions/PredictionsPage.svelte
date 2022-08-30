<script lang="ts" context="module">
  import { createSessionStore } from '../../util/session_store';

  import {
    type LocationGraphData,
    toLocationGraphDataSetByCluster
  } from '../../../frontend-core/clusters/location_graph_data';
  import type { ClusteringConfig } from '../../../frontend-core/clusters/clustering_config';
  import {
    type ClusterData,
    sortLocationGraphDataSet,
    toClusterData
  } from '../../../frontend-core/clusters/cluster_data';
  import type { PredictionTierStat } from '../../../frontend-core/clusters/prediction_stats';
  import {
    type ClusterSummaryStats,
    ClusterSummaryStatsGenerator
  } from '../../../frontend-core/clusters/summary_stats';

  const CLUSTER_STORE_VERSION = 10;

  interface ClusterStore {
    version: number;
    config: ClusteringConfig;
    dataByCluster: ClusterData[];
    summaryStats: ClusterSummaryStats;
  }

  const clusterStore = createSessionStore<ClusterStore | null>('clusters', null);
</script>

<script lang="ts">
  import { afterUpdate, tick } from 'svelte';

  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import BusyMessage from '../../common/BusyMessage.svelte';
  import ConfigClustersDialog from './ConfigClustersDialog.svelte';
  import AboutAccuracyDialog from './AboutAccuracy.svelte';
  import ClusterPieChart from './ClusterPieChart.svelte';
  import ClusterRadarChart from './ClusterRadarChart.svelte';
  import PredictionLookup from './PredictionLookup.svelte';
  import EffortGraph from './EffortGraph.svelte';
  import RegressedEffortGraph from './RegressedEffortGraph.svelte';
  import LocationEffortDialog from './LocationEffortDialog.svelte';
  import LocationBarGraph from './LocationBarGraph.svelte';
  import LocationFootnotes from './LocationFootnotes.svelte';
  import TaxonBarGraph from './TaxonBarGraph.svelte';
  import ClusterMap from './ClusterMap.svelte';
  import MoreLess from '../../components/MoreLess.svelte';
  import EmptyTab from '../../components/EmptyTab.svelte';
  import PredictionsHowTo from './PredictionsHowTo.svelte';
  import ConfirmationRequest from '../../common/ConfirmationRequest.svelte';
  import { showNotice } from '../../common/VariableNotice.svelte';
  import {
    PREDICTION_HISTORY_SAMPLE_DEPTH,
    TaxonRank,
    DissimilarityBasis,
    DissimilarityTransform,
    TaxonWeight,
    ComparedFauna,
    EffortFlags
  } from '../../../shared/model';
  import { client } from '../../stores/client';
  import { loadSeeds, sortIntoClusters, loadPoints } from '../../lib/cluster_client';
  import type { Point } from '../../../shared/point';
  import { DatasetType, getGraphSpec } from './dataset_type';
  import { ClusterColorSet } from './cluster_color_set';
  import { pageName } from '../../stores/pageName';

  $pageName = 'Collecting Predictions';
  const tabName = 'Predictions';

  const DEFAULT_CLUSTERING_CONFIG = {
    maxClusters: 12,
    comparedFauna: ComparedFauna.generaHavingCaveObligates,
    highestComparedRank: TaxonRank.Species,
    proximityResolution: true,
    minRecentPredictionPoints: 4,
    maxRecentPredictionPoints: 12,
    predictionHistorySampleDepth: PREDICTION_HISTORY_SAMPLE_DEPTH,
    maxPredictionTiers: 50
  };

  const clusterSpec = {
    comparedFauna: ComparedFauna.all, // ignored; overwritten
    minSpecies: 0,
    maxSpecies: 10000,
    metric: {
      basis: DissimilarityBasis.diffTaxa,
      transform: DissimilarityTransform.none,
      highestComparedRank: TaxonRank.Species, // ignored; overwritten
      weight: TaxonWeight.halfAgainWeight,
      proximityResolution: true // ignored; overwritten
    }
  };

  enum LoadState {
    idle,
    determiningSeeds,
    sortingIntoClusters,
    loadingData,
    processingData,
    ready
  }

  let clusteringRequest: ClusteringConfig | null = null;
  // @ts-ignore
  let loadState = LoadState.idle;
  let datasetType = DatasetType.personVisits;
  let clusterColors: ClusterColorSet[] = [];
  let clusterIndex = 0;
  let showingClusterMap = false;
  let showingAboutAccuracy = false;
  let showingAverageModel = false;
  let getLastDeltaSpecies: (locationData: LocationGraphData) => number;
  let getLocationValue: (locationData: LocationGraphData) => number | null;
  let getLocationPoints: (locationData: LocationGraphData) => Point[];
  let visitUnitName: string;
  let locationGraphData: LocationGraphData | null = null;
  let locationClusterNumber: number;
  let totalCaves: number;
  let requestClearConfirmation = false;

  let nonPredictionLocationDataset: LocationGraphData[];
  let predictionLocationDataset: LocationGraphData[];
  let greatestSingleVisitLocationValue: number;
  let greatestMultiVisitLocationValue: number;
  let predictionTierStats: PredictionTierStat[];
  let effortFlags: EffortFlags;

  // Handle change of version of cached data.
  $: if ($clusterStore && $clusterStore.version != CLUSTER_STORE_VERSION) {
    $clusterStore = null;
  }

  // Handle load of new cluster.
  $: if ($clusterStore) {
    clusterSpec.comparedFauna = $clusterStore.config.comparedFauna;
    clusterSpec.metric.highestComparedRank = $clusterStore.config.highestComparedRank;
    clusterSpec.metric.proximityResolution = $clusterStore.config.proximityResolution;

    totalCaves = 0;
    for (let i = 0; i < $clusterStore.dataByCluster.length; ++i) {
      totalCaves += $clusterStore.dataByCluster[i].locationGraphDataSet.length;
      clusterColors[i] = new ClusterColorSet(
        `hsl(${i * (360 / $clusterStore!.dataByCluster.length)}, 60%, 60%)`
      );
    }
  }

  // Handle change of selected cluster and graph viewed.
  $: if ($clusterStore) {
    _setClusterSelectorColor(clusterIndex); // dependent on changes to clusterIndex
    const clusterData = $clusterStore.dataByCluster[clusterIndex];

    if (datasetType == DatasetType.visits) {
      visitUnitName = 'visit';
      getLocationValue = (locationData) => locationData.predictedPerVisitDiff;
      getLocationPoints = (locationData) => locationData.perVisitPoints;
      predictionTierStats = clusterData.avgPerVisitTierStats;
    } else {
      visitUnitName = 'person-visit';
      getLocationValue = (locationData) => locationData.predictedPerPersonVisitDiff;
      getLocationPoints = (locationData) => locationData.perPersonVisitPoints;
      predictionTierStats = clusterData.avgPerPersonVisitTierStats;
    }

    const dataset = clusterData.locationGraphDataSet;
    // Have to sort here to pull out single-visit locations and get greatest value.
    sortLocationGraphDataSet(dataset, getLocationValue);

    const firstNonNullIndex = dataset.findIndex(
      (graphData) => getLocationValue(graphData) !== null
    );
    if (firstNonNullIndex > 0) {
      getLastDeltaSpecies = (locationData) => {
        const points = getLocationPoints(locationData);
        if (points.length == 1) return points[0].y;
        return points[points.length - 1].y - points[points.length - 2].y;
      };
      nonPredictionLocationDataset = dataset.slice(0, firstNonNullIndex);
      predictionLocationDataset = dataset.slice(firstNonNullIndex);
      // Have to sort here to get greatest value.
      sortLocationGraphDataSet(nonPredictionLocationDataset, getLastDeltaSpecies);
      greatestSingleVisitLocationValue = getLastDeltaSpecies(
        nonPredictionLocationDataset[0]
      );
    } else {
      nonPredictionLocationDataset = [];
      predictionLocationDataset = dataset;
    }
    if (predictionLocationDataset.length > 0) {
      greatestMultiVisitLocationValue = getLocationValue(predictionLocationDataset[0])!;
    }

    effortFlags = 0;
    for (const graphData of dataset) {
      effortFlags |= graphData.flags;
    }

    loadState = LoadState.ready;
  }

  function openLocation(locationData: LocationGraphData): void {
    locationGraphData = locationData;

    const dataByCluster = $clusterStore!.dataByCluster;
    for (let i = 0; i < dataByCluster.length; ++i) {
      const clusterData = dataByCluster[i];
      for (const graphData of clusterData.locationGraphDataSet) {
        if (graphData === locationData) {
          locationClusterNumber = i + 1;
          return;
        }
      }
    }
  }

  function closeLocation() {
    locationGraphData = null;
  }

  function _clearData() {
    requestClearConfirmation = false;
    clusterStore.set(null);
    $clusterStore = null;
  }

  async function _getSingleVisitLocationSubset(
    count: number,
    increasing: boolean
  ): Promise<[any[], boolean]> {
    sortLocationGraphDataSet(nonPredictionLocationDataset, getLastDeltaSpecies);
    if (increasing) nonPredictionLocationDataset.reverse();
    return [
      nonPredictionLocationDataset.slice(0, count),
      count < nonPredictionLocationDataset.length
    ];
  }

  async function _getMultiVisitLocationSubset(
    count: number,
    increasing: boolean
  ): Promise<[any[], boolean]> {
    sortLocationGraphDataSet(predictionLocationDataset, getLocationValue);
    if (increasing) predictionLocationDataset.reverse();
    return [
      predictionLocationDataset.slice(0, count),
      count < predictionLocationDataset.length
    ];
  }

  async function _loadData(config: ClusteringConfig) {
    clusterStore.set(null);

    clusterSpec.comparedFauna = config.comparedFauna;
    clusterSpec.metric.highestComparedRank = config.highestComparedRank;
    clusterSpec.metric.proximityResolution = config.proximityResolution;

    try {
      // Configure and load the data.

      loadState = LoadState.determiningSeeds;
      const seedLocations = await loadSeeds($client, clusterSpec, config.maxClusters);

      loadState = LoadState.sortingIntoClusters;
      const taxaClusters = await sortIntoClusters($client, clusterSpec, seedLocations);

      loadState = LoadState.loadingData;
      const rawClientEffortSetByCluster = await loadPoints(
        $client,
        config.comparedFauna,
        taxaClusters
      );
      const locationGraphDataSetByCluster = toLocationGraphDataSetByCluster(
        rawClientEffortSetByCluster
      );

      // Process the loaded data.

      loadState = LoadState.processingData;
      await tick();

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

      const summaryStats = new ClusterSummaryStatsGenerator(
        dataByCluster
      ).getSummaryStats();

      clusterStore.set({
        version: CLUSTER_STORE_VERSION,
        config,
        dataByCluster,
        summaryStats
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
      clusteringRequest = DEFAULT_CLUSTERING_CONFIG;
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

<DataTabRoute activeTab={tabName} embedHowTo={!$clusterStore}>
  <svelte:fragment slot="how-to"><PredictionsHowTo /></svelte:fragment>
  <svelte:fragment slot="body">
    <div class="container-fluid mb-3">
      <TabHeader {tabName} title={$pageName}>
        <span slot="instructions"
          >This tab clusters caves by the similarity of their fauna, and based on these
          clusterings, predicts the additional taxa that can be expected to be found in
          a cave. The tab also shows you the expected accuracy of the predictions
          according to the accuracy of the predictive technique on recent historical
          data. <MoreLess
            >To produce these predictions, you must first partition the data into
            clusters of caves having similar taxa. Selecting the appropriate clustering
            is a bit of an art, so you are provided with controls for exploring
            clusters. There is an element of randomness to each clustering, so you'll
            want to repeatedly generate clusters with the same criteria to find the best
            one. You can also use this tab to see graphs of visits to the caves and the
            frequency of encountering taxa in any cave. This tab only characterizes
            caves.</MoreLess
          ></span
        >
        <span slot="main-buttons">
          {#if $clusterStore}
            <button
              class="btn btn-minor"
              type="button"
              on:click={() => (requestClearConfirmation = true)}>Clear</button
            >
          {/if}
          <button class="btn btn-major" type="button" on:click={_openConfigDialog}
            >{$clusterStore ? 'Change' : 'Load'} Clusters</button
          >
        </span>
        <div slot="how-to"><PredictionsHowTo /></div>
      </TabHeader>

      {#if $clusterStore}
        {@const minRecentPredictionPoints =
          $clusterStore.config.minRecentPredictionPoints}
        {@const maxRecentPredictionPoints =
          $clusterStore.config.maxRecentPredictionPoints}
        {@const summaryStats = $clusterStore.summaryStats}

        <div class="cluster_title">
          {totalCaves} caves having
          {#if clusterSpec.comparedFauna == ComparedFauna.all}
            any taxon,
          {:else if clusterSpec.comparedFauna == ComparedFauna.caveObligates}
            troglobites,
          {:else if clusterSpec.comparedFauna == ComparedFauna.generaHavingCaveObligates}
            genera of troglobites,
          {/if}
          {$clusterStore.dataByCluster.length} clusters
        </div>
        <div class="cluster_params">
          max. <span>{$clusterStore.config.maxClusters}</span> clusters, comparing
          <span>
            {#if clusterSpec.comparedFauna == ComparedFauna.all}
              all fauna
            {:else if clusterSpec.comparedFauna == ComparedFauna.caveObligates}
              troglobites
            {:else if clusterSpec.comparedFauna == ComparedFauna.generaHavingCaveObligates}
              genera of troglobites
            {/if}
          </span>
          &lt;= <span>{clusterSpec.metric.highestComparedRank}</span>,
          <br />
          <span>{clusterSpec.metric.proximityResolution ? 'using' : 'not using'}</span>
          proximity, min.&ndash;max.
          <span>{$clusterStore.config.minRecentPredictionPoints}</span>&ndash;<span
            >{$clusterStore.config.maxRecentPredictionPoints}</span
          > recent visits
        </div>

        <div class="row mt-3 ms-4 me-4 justify-content-center">
          <div class="col-sm col-md-12 col-lg-10 accuracy_stats">
            <div class="row pt-3 justify-content-center">
              <div class="col-md-4">
                <div class="row mt-2">
                  <div class="col text-center accuracy_header">Overall Accuracy</div>
                </div>
                <div class="row mt-2">
                  <div class="col stat">
                    <span>{Math.round(summaryStats.generalCaves)}</span> % +spp. (<span
                      >{summaryStats.cavesWithSpeciesPredictions}</span
                    > caves)
                  </div>
                </div>
                <div class="row">
                  <div class="col stat">
                    <span>{Math.round(summaryStats.generalTaxa)}</span> % +taxa (<span
                      >{summaryStats.cavesWithTaxaPredictions}</span
                    > caves)
                  </div>
                </div>
                <div class="row mt-3 mb-3 text-center">
                  <div
                    class="col link_text"
                    on:click={() => (showingAboutAccuracy = true)}
                  >
                    about accuracy
                  </div>
                </div>
              </div>
              <div class="col-md-8">
                <div class="row">
                  <div class="col-6 text-end accuracy_header">Accuracy Summary</div>
                  <div class="col-3 stat">Top 10</div>
                  <div class="col-2 stat">Top 20</div>
                </div>
                <div class="row mt-1">
                  <div class="col-6 text-end">+spp. next visit</div>
                  <div class="col-3 stat">
                    <span>{summaryStats.avgTop10PerVisitCaves.toFixed(1)}</span> %
                  </div>
                  <div class="col-2 stat">
                    <span>{summaryStats.avgTop20PerVisitCaves.toFixed(1)}</span> %
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-6 text-end">+spp. next person-visit</div>
                  <div class="col-3 stat">
                    <span>{summaryStats.avgTop10PerPersonVisitCaves.toFixed(1)}</span> %
                  </div>
                  <div class="col-2 stat">
                    <span>{summaryStats.avgTop20PerPersonVisitCaves.toFixed(1)}</span> %
                  </div>
                </div>
                <div class="row mt-2">
                  <div class="col-6" />
                  <div class="col-3 stat">Top 3</div>
                  <div class="col-2 stat">Top 6</div>
                </div>
                <div class="row mt-1 mb-3">
                  <div class="col-6 text-end">+taxa per cave</div>
                  <div class="col-3 stat">
                    <span>{summaryStats.avgTop3NextTaxa.toFixed(1)}</span> %
                  </div>
                  <div class="col-2 stat">
                    <span>{summaryStats.avgTop6NextTaxa.toFixed(1)}</span> %
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row justify-content-center">
          <div
            class="col d-flex align-items-center"
            style="max-width: 320px; margin-top: 40px"
          >
            <div class="text-center">
              <button
                class="btn btn-major mb-4"
                type="button"
                on:click={() => (showingClusterMap = true)}>Show Cluster Map</button
              >
              <ClusterPieChart
                dataByCluster={$clusterStore.dataByCluster}
                {clusterColors}
              />
            </div>
          </div>
          <div class="col" style="max-width: 460px">
            <ClusterRadarChart
              dataByCluster={$clusterStore.dataByCluster}
              {clusterColors}
            />
          </div>
        </div>

        <div class="row mt-4 mb-4 justify-content-center">
          <div class="col-md-8">
            <PredictionLookup
              dataByCluster={$clusterStore.dataByCluster}
              openCave={openLocation}
            />
          </div>
        </div>

        <hr />
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
                bind:group={datasetType}
                name="dataset"
                id={DatasetType.visits}
                value={DatasetType.visits}
              />
              <label class="btn btn-outline-primary" for={DatasetType.visits}
                >Visits</label
              >
              <input
                type="radio"
                class="btn-check"
                bind:group={datasetType}
                name="dataset"
                id={DatasetType.personVisits}
                value={DatasetType.personVisits}
              />
              <label class="btn btn-outline-primary" for={DatasetType.personVisits}
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

        {@const config = $clusterStore.config}
        {@const clusterData = $clusterStore.dataByCluster[clusterIndex]}
        {@const clusterColor = clusterColors[clusterIndex].foreground}
        {@const multipleClusters =
          $clusterStore && $clusterStore.dataByCluster.length > 1}
        {@const graphTitlePrefix = multipleClusters ? `#${clusterIndex + 1}: ` : ''}

        {#if !showingAverageModel}
          {@const graphSpec = getGraphSpec(config, datasetType, false)}
          <div class="row mt-3 mb-1">
            <div class="col" style="height: 350px">
              <EffortGraph
                title={graphTitlePrefix + graphSpec.graphTitle}
                color={clusterColor}
                graphDataSet={clusterData.locationGraphDataSet}
                totalCaves={clusterData.locationGraphDataSet.length}
                {graphSpec}
              />
            </div>
          </div>
        {:else}
          {@const graphSpec = getGraphSpec(config, datasetType, true)}
          <RegressedEffortGraph
            title={graphTitlePrefix + graphSpec.graphTitle}
            color={clusterColor}
            sourceDataSet={clusterData.locationGraphDataSet}
            {graphSpec}
            clusteringConfig={$clusterStore.config}
          />
        {/if}
        <LocationFootnotes flags={effortFlags} />

        {#if predictionLocationDataset.length > 0}
          <hr />
          <div id="predicted_additional_species">
            <LocationBarGraph
              title="Predicted additional species on next {visitUnitName}"
              tierStats={predictionTierStats}
              getItems={_getMultiVisitLocationSubset}
              greatestValue={greatestMultiVisitLocationValue}
              getValue={getLocationValue}
              getPoints={getLocationPoints}
              items={predictionLocationDataset}
              {visitUnitName}
              {openLocation}
              >This chart shows the number of additional species predicted to be found
              at a cave on the next {visitUnitName} to the cave, according to a power curve
              (total species <span class="eq">y</span> <span class="eq">=</span>
              <span class="eq">Ax<sup>P</sup>+B</span> for {visitUnitName}s
              <span class="eq">x</span>) fit to the points of the most recent {#if minRecentPredictionPoints != maxRecentPredictionPoints}{minRecentPredictionPoints}
                to{/if}
              {maxRecentPredictionPoints}
              visits to the cave, as requested. {#if minRecentPredictionPoints == 2}For
                caves with only 2 visits, the predicted additional species is given by
                the slope of the line through their points.{/if} To measure accuracy, <MoreLess
                >the technique was applied to historical data to predict the additional
                species of each of the {PREDICTION_HISTORY_SAMPLE_DEPTH}
                most recent visits to each cave. The chart reports the average percentage
                of caves that it correctly predicted would occur within each top group of
                N caves according to a sort of the number of species predicted.
                <i
                  >For example, a top 5 accuracy of 25% would mean that the technique
                  correctly predicted which caves would be among the top 5 yielding the
                  most species 25% of the time.</i
                ></MoreLess
              ></LocationBarGraph
            >
          </div>
        {/if}
        {#if nonPredictionLocationDataset.length > 0}
          <hr />
          <div id="no_prediction_caves">
            <LocationBarGraph
              title="Caves with too few visits for predictions"
              getItems={_getSingleVisitLocationSubset}
              greatestValue={greatestSingleVisitLocationValue}
              getValue={getLastDeltaSpecies}
              getPoints={getLocationPoints}
              items={nonPredictionLocationDataset}
              {visitUnitName}
              {openLocation}
              >This chart lists the caves having fewer than the requested minimum {minRecentPredictionPoints}
              visits for making predictions. It sorts the caves by the number of species
              found on the most recent visit.</LocationBarGraph
            >
          </div>
        {/if}
        <hr />
        <div id="taxa_in_cluster">
          <TaxonBarGraph
            title="Frequency of taxa found in this cluster"
            visitsByTaxonUnique={clusterData.visitsByTaxonUnique}
            locationGraphDataSet={clusterData.locationGraphDataSet}
            >This chart shows all the taxa found in the caves of this cluster, sorted by
            the number of visits in which they were found. It illustrates the frequency
            of occurrence of taxa in this cluster rather than the frequency of
            occurrence of specimens. Each bar depicts the fraction of the total number
            of visits in which a taxon was found.</TaxonBarGraph
          >
        </div>
      {:else}
        <EmptyTab
          message={'Click the "Load Clusters" button to generate predictions.'}
        />
      {/if}
    </div>
  </svelte:fragment>
</DataTabRoute>

{#if showingAboutAccuracy}
  <AboutAccuracyDialog close={() => (showingAboutAccuracy = false)} />
{/if}

{#if showingClusterMap && $clusterStore}
  <ClusterMap
    {clusterColors}
    dataByCluster={$clusterStore.dataByCluster}
    close={() => (showingClusterMap = false)}
  />
{/if}

{#if clusteringRequest !== null}
  <ConfigClustersDialog
    config={clusteringRequest}
    close={_onCloseConfigDialog}
    submit={_onSubmitConfigDialog}
  />
{/if}

{#if locationGraphData !== null && $clusterStore}
  {@const clusterData = $clusterStore.dataByCluster[clusterIndex]}
  <LocationEffortDialog
    config={$clusterStore.config}
    clusterNumber={locationClusterNumber}
    clusterVisitsByTaxonUnique={clusterData.visitsByTaxonUnique}
    {locationGraphData}
    locationGraphDataSet={clusterData.locationGraphDataSet}
    taxonTierStats={clusterData.avgTaxaTierStats}
    close={closeLocation}
  />
{/if}

{#if requestClearConfirmation}
  <ConfirmationRequest
    alert="warning"
    message="Clear these clusters and predictions?"
    okayButton="Clear"
    onOkay={_clearData}
    onCancel={() => (requestClearConfirmation = false)}
  />
{/if}

{#if $clusterStore === null}
  {#if loadState == LoadState.determiningSeeds}
    <BusyMessage message="Determining seed locations..." />
  {:else if loadState == LoadState.sortingIntoClusters}
    <BusyMessage message="Sorting into clusters..." />
  {:else if loadState == LoadState.loadingData}
    <BusyMessage message="Loading the data..." />
  {:else if loadState == LoadState.processingData}
    <BusyMessage message="Processing the data..." />
  {/if}
{/if}

<style lang="scss">
  @import '../../variables.scss';

  .cluster_title {
    font-size: 1.2rem;
    font-weight: bold;
    text-align: center;
  }
  .cluster_params {
    font-size: 0.95rem;
    color: #999;
    text-align: center;
  }
  .cluster_params span {
    color: #000;
  }

  .accuracy_header {
    font-weight: bold;
    font-size: 1rem;
  }
  .accuracy_stats {
    font-size: 0.95rem;
    border: 1px solid $footnoteColor;
    border-radius: $border-radius;
    background-color: #eee;
    margin-bottom: -0.5rem;
  }
  .accuracy_stats .stat {
    text-align: center;
  }
  .accuracy_stats .stat span {
    font-weight: bold;
  }

  #cluster_selector {
    display: inline-block;
    border-top-left-radius: $border-radius;
    border-bottom-left-radius: $border-radius;
  }
  #cluster_color {
    display: inline-block;
    width: 1.3rem;
    border-top-right-radius: $border-radius;
    border-bottom-right-radius: $border-radius;
  }

  .eq {
    font-family: 'Courier New', Courier, monospace;
  }
</style>
