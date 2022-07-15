<script lang="ts" context="module">
  import { createSessionStore } from '../../util/session_store';

  import {
    type ClientLocationEffort,
    toClientEffortSetByCluster
  } from './client_location_effort';
  import {
    type ClusteringConfig,
    type ClusterData,
    toClusterData,
    toFittedModel
  } from './cluster_data';

  interface Clustering {
    config: ClusteringConfig;
    dataByCluster: ClusterData[];
  }

  const effortStore = createSessionStore<ClientLocationEffort[][] | null>(
    'client_location_effort',
    null
  );
  const clustering = createSessionStore<Clustering | null>('clustering', null);

  const PINK_HEXCOLOR = '#FF0088';
  const AQUA_HEXCOLOR = '#00DCD8';
  const PURPLE_HEXCOLOR = '#A95CFF';
  const GREEN_HEXCOLOR = '#00D40E';
</script>

<script lang="ts">
  import { afterUpdate } from 'svelte';

  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import BusyMessage from '../../common/BusyMessage.svelte';
  import ConfigClustersDialog from './ConfigClustersDialog.svelte';
  import ClusterPieChart from './ClusterPieChart.svelte';
  import ClusterRadarChart from './ClusterRadarChart.svelte';
  import ModelStats from './ModelStats.svelte';
  import EffortGraph, { type EffortGraphSpec } from './EffortGraph.svelte';
  import ResidualsPlot from './ResidualsPlot.svelte';
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
  import type { FittedModel } from './fitted_model';
  import { ClusterColorSet } from './cluster_color_set';
  import { pageName } from '../../stores/pageName';

  $pageName = 'Collection Effort';

  const MAX_CLUSTERS = 10;
  const LOWER_BOUND_X = 0;
  const UPPER_BOUND_X = Infinity;
  const MIN_X_ALLOWING_REGRESS = 10;
  const MODEL_WEIGHT_POWER = 0;

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
    days = 'days',
    visits = 'per-visit-set',
    personVisits = 'per-person-visit-set'
  }

  let clusteringRequest: ClusteringConfig | null = null;
  // @ts-ignore
  let loadState = LoadState.idle;
  let datasetID = DatasetID.personVisits;
  let clusterColors: ClusterColorSet[] = [];
  let localityCountByCluster: number[] = [];
  let clusterIndex = 0;
  let clusterModel: FittedModel | null = null;

  $: if ($clustering) {
    clusterSpec.comparedTaxa = $clustering.config.comparedTaxa;
    clusterSpec.ignoreSubgenera = $clustering.config.ignoreSubgenera;
    clusterSpec.metric.highestComparedRank = $clustering.config.highestComparedRank;

    for (let i = 0; i < $clustering.dataByCluster.length; ++i) {
      const clusterData = $clustering.dataByCluster[i];
      localityCountByCluster[i] = clusterData.locationCount;
      clusterColors[i] = new ClusterColorSet(
        `hsl(${i * (360 / $clustering!.dataByCluster.length)}, 60%, 60%)`
      );
    }
  }

  $: if ($clustering) {
    _setClusterSelectorColor(clusterIndex); // dependent on changes to clusterIndex
    loadState = LoadState.ready;
  }

  function _clearData() {
    effortStore.set(null);
    clustering.set(null);
    $clustering = null;
  }

  function _getGraphSpec(
    datasetID: DatasetID,
    clusterData: ClusterData
  ): EffortGraphSpec {
    // datasetID is passed in to get reactivity in the HTML
    switch (datasetID) {
      case DatasetID.days:
        return {
          graphTitle: 'Cumulative species across days',
          xAxisLabel: 'days',
          yAxisLabel: 'cumulative species',
          multiPointSet: clusterData.perDayTotalsPointSets
        };
      case DatasetID.visits:
        return {
          graphTitle: 'Cumulative species across visits',
          xAxisLabel: 'visits',
          yAxisLabel: 'cumulative species',
          multiPointSet: clusterData.perVisitTotalsPointSets
        };
      case DatasetID.personVisits:
        return {
          graphTitle: 'Cumulative species across person-visits',
          xAxisLabel: 'person-visits',
          yAxisLabel: 'cumulative species',
          multiPointSet: clusterData.perPersonVisitTotalsPointSets
        };
    }
  }

  async function _loadData(config: ClusteringConfig) {
    effortStore.set(null);
    clustering.set(null);

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
      const clientEffortSetByCluster = toClientEffortSetByCluster(
        rawClientEffortSetByCluster
      );
      effortStore.set(clientEffortSetByCluster);

      // Process the loaded data.

      loadState = LoadState.generatingPlotData;
      const dataByCluster: ClusterData[] = [];
      for (let i = 0; i < taxaClusters.length; ++i) {
        const clientEffortSet = clientEffortSetByCluster[i];
        dataByCluster.push(
          toClusterData(
            taxaClusters[i].visitsByTaxonUnique,
            clientEffortSet,
            LOWER_BOUND_X,
            config.minPointsToRegress,
            config.maxPointsToRegress
          )
        );
      }
      dataByCluster.sort((a, b) => {
        const aTaxaCount = Object.keys(a.visitsByTaxonUnique).length;
        const bTaxaCount = Object.keys(b.visitsByTaxonUnique).length;
        if (aTaxaCount == bTaxaCount) return 0;
        return bTaxaCount - aTaxaCount; // sort most taxa first
      });
      clustering.set({
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
    if ($clustering) {
      clusteringRequest = $clustering.config;
    } else {
      clusteringRequest = {
        maxClusters: MAX_CLUSTERS,
        comparedTaxa: ComparedTaxa.generaHavingCaveObligates,
        ignoreSubgenera: false,
        highestComparedRank: TaxonRank.Genus,
        minPointsToRegress: 3,
        maxPointsToRegress: 12
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
    if (clusterModel) {
      clusterModel = null;
    } else {
      const clusterData = $clustering!.dataByCluster[clusterIndex];
      const graphSpec = _getGraphSpec(datasetID, clusterData as ClusterData);
      clusterModel = toFittedModel(
        graphSpec.multiPointSet,
        MIN_X_ALLOWING_REGRESS,
        MODEL_WEIGHT_POWER
      );
    }
  }

  afterUpdate(() => _setClusterSelectorColor(clusterIndex));
</script>

<DataTabRoute activeTab="Effort">
  <div class="container-fluid mb-3">
    <TabHeader title={$pageName}>
      <span slot="main-buttons">
        {#if $clustering}
          <button class="btn btn-minor" type="button" on:click={_clearData}
            >Clear</button
          >
        {/if}
        <button class="btn btn-major" type="button" on:click={_openConfigDialog}
          >{$clustering ? 'Change' : 'Load'} Data</button
        >
      </span>
    </TabHeader>

    {#if $clustering !== null}
      <div class="cluster_summary_info">
        <div class="row mt-3">
          <div class="col">
            <span>{$clustering.config.maxClusters} clusters max</span>
          </div>
          <div class="col">comparing: <span>{clusterSpec.comparedTaxa}</span></div>
          <div class="col" />
        </div>
        <div class="row">
          <div class="col"><span>{clusterSpec.metric.basis}</span></div>
          <div class="col">
            highest comparison: <span>{clusterSpec.metric.highestComparedRank}</span>
          </div>
          <div class="col">
            regressed: <span
              >{LOWER_BOUND_X} &lt;= x &lt;=
              {@html UPPER_BOUND_X == Infinity ? '&infin;' : UPPER_BOUND_X}</span
            >
          </div>
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
          <div class="col">
            min. x => regression: <span>{MIN_X_ALLOWING_REGRESS}</span>
          </div>
          <div class="col" />
        </div>
        <div class="row">
          <div class="col">
            metric weight: <span>{clusterSpec.metric.weight}</span>
          </div>
          <div class="col">model weight power: <span>{MODEL_WEIGHT_POWER}</span></div>
          <div class="col" />
        </div>
      </div>

      <div class="row justify-content-center">
        <div class="col" style="max-width: 480px">
          <ClusterRadarChart
            dataByCluster={$clustering.dataByCluster}
            {clusterColors}
          />
        </div>
        <div class="col d-flex align-items-center" style="max-width: 300px">
          <ClusterPieChart dataByCluster={$clustering.dataByCluster} {clusterColors} />
        </div>
      </div>

      {#if $clustering}
        <div class="row justify-content-between mt-4 ms-4 me-4">
          <div class="col-auto d-flex align-items-center">
            <div class="form-group">
              <div class="input-group">
                <div id="cluster_color" />
                <select
                  id="cluster_selector"
                  class="form-select form-select-sm item_select ms-1"
                  bind:value={clusterIndex}
                >
                  {#each $clustering.dataByCluster as _, i}
                    <option value={i}>Cluster #{i + 1}</option>
                  {/each}
                </select>
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
              <label class="btn btn-outline-primary" for={DatasetID.visits}
                >Visits</label
              >
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
              >Fit Curve</button
            >
          </div>
        </div>
      {/if}

      {@const clusterData = $clustering.dataByCluster[clusterIndex]}
      {@const multipleClusters = $clustering && $clustering.dataByCluster.length > 1}
      {@const graphSpec = _getGraphSpec(datasetID, clusterData)}
      {@const graphTitle =
        (multipleClusters ? `#${clusterIndex + 1}: ` : '') +
        graphSpec.graphTitle +
        ` (${clusterData.locationCount} caves)`}

      {#if clusterModel !== null}
        <div class="row mt-3 mb-1">
          <div class="col" style="height: 350px">
            <EffortGraph
              title={graphTitle}
              hexColor={PINK_HEXCOLOR}
              spec={graphSpec}
              model={clusterModel}
            />
          </div>
        </div>
        <div class="row mb-3 gx-0 ms-4">
          <div class="col-sm-6">
            <ResidualsPlot hexColor={PINK_HEXCOLOR} model={clusterModel} />
          </div>
        </div>
        <ModelStats hexColor={PINK_HEXCOLOR} model={clusterModel} />
      {:else}
        <div class="row mt-3 mb-1">
          <div class="col" style="height: 350px">
            <EffortGraph title={graphTitle} hexColor={PINK_HEXCOLOR} spec={graphSpec} />
          </div>
        </div>
        <div class="row mb-3 gx-0 ms-4">
          <div class="col-sm-6">Too few points to perform a regression.</div>
        </div>
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

{#if $clustering === null}
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
  @import '../../variables.scss';

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
