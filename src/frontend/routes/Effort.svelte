<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';

  import type { EffortGraphConfig } from '../components/EffortGraph.svelte';

  export interface EffortData {
    locationID: number;
    startDate: Date;
    endDate: Date;
    perVisitPoints: Point[];
    perPersonVisitPoints: Point[];
  }

  interface PerClusterGraphData {
    locationCount: number;
    perVisitTotalsGraph: EffortGraphConfig;
    perPersonVisitTotalsGraph: EffortGraphConfig;
  }

  const clusterStore = createSessionStore<EffortData[][] | null>('cluster_data', null);
  const graphStore = createSessionStore<PerClusterGraphData[] | null>(
    'graph_data',
    null
  );
  //const clusterIndex = createSessionStore<number>('cluster_index', 0);
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
    type EffortResult,
    SeedType,
    type LocationSpec,
    DistanceMeasure
  } from '../../shared/model';
  import { client } from '../stores/client';
  import { type Point, QuadraticModel, PowerModel } from '../lib/linear_regression';

  const MIN_PERSON_VISITS = 0;

  enum LoadState {
    idle,
    loading,
    processing,
    ready
  }

  enum DatasetID {
    visits = 'per-visit-set',
    personVisits = 'per-person-visit-set'
  }

  let loadState = LoadState.idle;
  let datasetID = DatasetID.personVisits;

  $: showingPersonVisits = datasetID == DatasetID.personVisits;

  const pairToPoint = (pair: number[]) => {
    return { x: pair[0], y: pair[1] };
  };

  const loadPoints = async () => {
    loadState = LoadState.loading;
    let res = await $client.post('api/cluster/get_seeds', {
      seedSpec: {
        seedType: SeedType.diverse,
        maxClusters: 12,
        minSpecies: 0,
        maxSpecies: 10000
      }
    });
    const seeds: LocationSpec[] = res.data.seeds;
    if (!seeds) showNotice({ message: 'Failed to load seeds' });

    res = await $client.post('api/cluster/get_clusters', {
      seedIDs: seeds.map((location) => location.locationID),
      distanceMeasure: DistanceMeasure.weighted,
      minSpecies: 0,
      maxSpecies: 10000
    });
    const clusters: number[][] = res.data.clusters;
    if (!clusters) showNotice({ message: 'Failed to load clusters' });

    const workingClusterData: EffortData[][] = [];
    for (const cluster of clusters) {
      if (cluster.length > 0) {
        res = await $client.post('api/location/get_effort', {
          locationIDs: cluster
        });
        const clusterData: EffortData[] = [];
        const effortResults: EffortResult[] = res.data.efforts;
        for (const effortResult of effortResults) {
          if (effortResult.perVisitPoints.length >= MIN_PERSON_VISITS) {
            clusterData.push(_toEffortData(effortResult));
          }
        }
        if (clusterData.length > 0) {
          workingClusterData.push(clusterData);
        }
      }
    }

    clusterStore.set(workingClusterData);

    loadState = LoadState.processing;
    const clusterGraphData: PerClusterGraphData[] = [];
    for (const clusterEffortData of $clusterStore!) {
      clusterGraphData.push(_toClusterGraphData(clusterEffortData));
    }
    clusterGraphData.sort((a, b) => {
      const aPointCount = a.perPersonVisitTotalsGraph.points.length;
      const bPointCount = b.perPersonVisitTotalsGraph.points.length;
      if (aPointCount == bPointCount) return 0;
      return bPointCount - aPointCount; // sort most points first
    });

    graphStore.set(clusterGraphData);

    loadState = LoadState.ready;
  };

  function _toEffortData(effortResult: EffortResult): EffortData {
    const perVisitPointPairs: number[][] = JSON.parse(effortResult.perVisitPoints);
    const perVisitPoints: Point[] = [];
    for (const pair of perVisitPointPairs) {
      perVisitPoints.push(pairToPoint(pair));
    }

    const perPersonVisitPointPairs: number[][] = JSON.parse(
      effortResult.perPersonVisitPoints
    );
    const perPersonVisitPoints: Point[] = [];
    for (const pair of perPersonVisitPointPairs) {
      perPersonVisitPoints.push(pairToPoint(pair));
    }

    return {
      locationID: effortResult.locationID,
      startDate: effortResult.startDate,
      endDate: effortResult.endDate,
      perVisitPoints: perVisitPoints,
      perPersonVisitPoints: perPersonVisitPoints
    };
  }

  function _toClusterGraphData(clusterEffortData: EffortData[]): PerClusterGraphData {
    let locationCount = clusterEffortData.length;
    let perVisitTotalsGraph: EffortGraphConfig = {
      locationCount,
      graphTitle: `Cumulative species across visits (${locationCount} caves)`,
      yAxisLabel: 'cumulative species',
      xAxisLabel: 'visits',
      pointCount: 0, // will update
      points: [] // will update
    };
    let perPersonVisitTotalsGraph: EffortGraphConfig = {
      locationCount,
      graphTitle: `Cumulative species across person-visits (${locationCount} caves)`,
      yAxisLabel: 'cumulative species',
      xAxisLabel: 'person-visits',
      pointCount: 0, // will update
      points: [] // will update
    };

    for (const effortData of clusterEffortData) {
      let priorSpeciesCount = 0;
      for (const point of effortData.perVisitPoints) {
        perVisitTotalsGraph.points.push(point);
        if (priorSpeciesCount != 0) {
          const speciesDiff = point.y - priorSpeciesCount;
        }
        ++perVisitTotalsGraph.pointCount;
        priorSpeciesCount = point.y;
      }

      priorSpeciesCount = 0;
      for (const point of effortData.perPersonVisitPoints) {
        perPersonVisitTotalsGraph.points.push(point);
        if (priorSpeciesCount != 0) {
          const speciesDiff = point.y - priorSpeciesCount;
        }
        ++perPersonVisitTotalsGraph.pointCount;
        priorSpeciesCount = point.y;
      }
    }

    return {
      locationCount,
      perVisitTotalsGraph,
      perPersonVisitTotalsGraph
    };
  }

  const clearData = () => {
    clusterStore.set(null);
    graphStore.set(null);
    location.reload();
  };
</script>

<DataTabRoute activeTab="Effort">
  <div class="container-fluid">
    <TabHeader title="Collection Effort" instructions="Instructions TBD">
      <span slot="main-buttons">
        {#if $graphStore != null}
          <button class="btn btn-minor" type="button" on:click={clearData}
            >Clear Data</button
          >
        {/if}
      </span>
      <span slot="work-buttons">
        {#if $graphStore}
          <!-- <select
            bind:value={$clusterIndex}
            on:change={() => _setGraphData($clusterIndex)}
          >
            {#each $clusterData as cluster, i}
              <option value={i}>
                [{i}]: {cluster.length} locations
              </option>
            {/each}
          </select> -->
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
        {/if}
      </span>
    </TabHeader>

    {#if $graphStore === null}
      <button class="btn btn-major" type="button" on:click={loadPoints}
        >Load Data</button
      >
    {:else}
      {#each $graphStore as clusterGraphData, i}
        {@const graphData = showingPersonVisits
          ? clusterGraphData.perPersonVisitTotalsGraph
          : clusterGraphData.perVisitTotalsGraph}
        {@const powerFit = new PowerModel('FF0088', graphData.points)}
        {@const quadraticFit = new QuadraticModel('00DCD8', graphData.points)}
        <div class="row mt-3 mb-1">
          <div class="col" style="height: 350px">
            <EffortGraph
              title={($graphStore.length > 1 ? `#${i + 1}: ` : '') +
                graphData.graphTitle}
              config={graphData}
              models={[powerFit, quadraticFit]}
              modelPlots={[powerFit.points, quadraticFit.points]}
            />
          </div>
        </div>
        <div class="row mb-3 gx-0 ms-4">
          <div class="col-sm-6"><ResidualsPlot model={powerFit} /></div>
          <div class="col-sm-6"><ResidualsPlot model={quadraticFit} /></div>
        </div>
        <ModelStats model={powerFit} />
        <ModelStats model={quadraticFit} />
      {/each}
    {/if}
  </div>
</DataTabRoute>

{#if $graphStore === null}
  {#if loadState == LoadState.loading}
    <BusyMessage message="Loading points..." />
  {:else if loadState == LoadState.processing}
    <BusyMessage message="Processing points..." />
  {/if}
{/if}
