<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';

  interface Point {
    x: number;
    y: number;
  }

  export interface EffortData {
    locationID: number;
    startDate: Date;
    endDate: Date;
    perVisitPoints: Point[];
    perPersonVisitPoints: Point[];
  }

  interface PerGraphData {
    locationCount: number;
    graphTitle: string;
    xAxisLabel: string;
    yAxisLabel: string;
    pointCount: number;
    points: Point[];
  }

  interface PerClusterGraphData {
    locationCount: number;
    perVisitTotalsGraph: PerGraphData;
    perPersonVisitTotalsGraph: PerGraphData;
    perVisitDiffsGraph: PerGraphData;
    perPersonVisitDiffsGraph: PerGraphData;
    perVisitAddedPercentGraph: PerGraphData;
    perPersonVisitAddedPercentGraph: PerGraphData;
    perVisitPercentChangeGraph: PerGraphData;
    perPersonVisitPercentChangeGraph: PerGraphData;
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
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';
  import { showNotice } from '../common/VariableNotice.svelte';
  import {
    type EffortResult,
    SeedType,
    type LocationSpec,
    DistanceMeasure
  } from '../../shared/model';
  import { client } from '../stores/client';

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

  enum BasisID {
    totals = 'basis-totals',
    diffs = 'basis-diffs',
    addedPercent = 'basis-added-percent',
    percentChange = 'basis-percent-change'
  }

  let loadState = LoadState.idle;
  let datasetID = DatasetID.personVisits;
  let basisID = BasisID.totals;

  $: showingPersonVisits = datasetID == DatasetID.personVisits;

  const pairToPoint = (pair: number[]) => {
    return { x: pair[0], y: pair[1] };
  };

  const loadPoints = async () => {
    loadState = LoadState.loading;
    let res = await $client.post('api/cluster/get_seeds', {
      seedSpec: {
        seedType: SeedType.diverse,
        maxClusters: 16,
        minSpecies: 0,
        maxSpecies: 10000
      }
    });
    const seeds: LocationSpec[] = res.data.seeds;
    if (!seeds) showNotice({ message: 'Failed to load seeds' });

    res = await $client.post('api/cluster/get_clusters', {
      seedIDs: seeds.map((location) => location.locationID),
      distanceMeasure: DistanceMeasure.weighted,
      minSpecies: 0
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
          clusterData.push(_toEffortData(effortResult));
        }
        workingClusterData.push(clusterData);
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
    let perVisitTotalsGraph: PerGraphData = {
      locationCount,
      graphTitle: `Cumulative species across visits (${locationCount} caves)`,
      yAxisLabel: 'cumulative species',
      xAxisLabel: 'visits',
      pointCount: 0, // will update
      points: [] // will update
    };
    let perPersonVisitTotalsGraph: PerGraphData = {
      locationCount,
      graphTitle: `Cumulative species across person-visits (${locationCount} caves)`,
      yAxisLabel: 'cumulative species',
      xAxisLabel: 'person-visits',
      pointCount: 0, // will update
      points: [] // will update
    };
    let perVisitDiffsGraph: PerGraphData = {
      locationCount,
      graphTitle: `Additional species across visits (${locationCount} caves)`,
      yAxisLabel: 'additional species',
      xAxisLabel: 'visits',
      pointCount: 0, // will update
      points: [] // will update
    };
    let perPersonVisitDiffsGraph: PerGraphData = {
      locationCount,
      graphTitle: `Additional species across person-visits (${locationCount} caves)`,
      yAxisLabel: 'additional species',
      xAxisLabel: 'person-visits',
      pointCount: 0, // will update
      points: [] // will update
    };
    let perVisitAddedPercentGraph: PerGraphData = {
      locationCount,
      graphTitle: `Percent species added across (${locationCount} caves)`,
      yAxisLabel: 'Cumulative % species added',
      xAxisLabel: 'visits',
      pointCount: 0, // will update
      points: [] // will update
    };
    let perPersonVisitAddedPercentGraph: PerGraphData = {
      locationCount,
      graphTitle: `Percent species added across person-visits (${locationCount} caves)`,
      yAxisLabel: 'Cumulative % species added',
      xAxisLabel: 'person-visits',
      pointCount: 0, // will update
      points: [] // will update
    };
    let perVisitPercentChangeGraph: PerGraphData = {
      locationCount,
      graphTitle: `Percent species change from visit to visit (${locationCount} caves)`,
      yAxisLabel: '% increase in species',
      xAxisLabel: 'visits',
      pointCount: 0, // will update
      points: [] // will update
    };
    let perPersonVisitPercentChangeGraph: PerGraphData = {
      locationCount,
      graphTitle: `Percent species change from person-visit to person-visit (${locationCount} caves)`,
      yAxisLabel: '% increase in species',
      xAxisLabel: 'person-visits',
      pointCount: 0, // will update
      points: [] // will update
    };

    for (const effortData of clusterEffortData) {
      let priorSpeciesCount = 0;
      let priorCumulativePercentChange = 0;
      for (const point of effortData.perVisitPoints) {
        perVisitTotalsGraph.points.push(point);
        if (priorSpeciesCount != 0) {
          const speciesDiff = point.y - priorSpeciesCount;
          perVisitDiffsGraph.points.push({
            x: point.x,
            y: speciesDiff
          });
          const percentChange =
            (100 * (point.y - priorSpeciesCount)) / priorSpeciesCount;
          perVisitPercentChangeGraph.points.push({
            x: point.x,
            y: percentChange
          });
          priorCumulativePercentChange += percentChange;
          perVisitAddedPercentGraph.points.push({
            x: point.x,
            y: priorCumulativePercentChange
          });
        }
        ++perVisitTotalsGraph.pointCount;
        ++perVisitDiffsGraph.pointCount;
        ++perVisitPercentChangeGraph.pointCount;
        ++perVisitAddedPercentGraph.pointCount;
        priorSpeciesCount = point.y;
      }

      priorSpeciesCount = 0;
      priorCumulativePercentChange = 0;
      for (const point of effortData.perPersonVisitPoints) {
        perPersonVisitTotalsGraph.points.push(point);
        if (priorSpeciesCount != 0) {
          const speciesDiff = point.y - priorSpeciesCount;
          perPersonVisitDiffsGraph.points.push({
            x: point.x,
            y: speciesDiff
          });
          const percentChange =
            (100 * (point.y - priorSpeciesCount)) / priorSpeciesCount;
          perPersonVisitPercentChangeGraph.points.push({
            x: point.x,
            y: percentChange
          });
          priorCumulativePercentChange += percentChange;
          perPersonVisitAddedPercentGraph.points.push({
            x: point.x,
            y: priorCumulativePercentChange
          });
        }
        ++perPersonVisitTotalsGraph.pointCount;
        ++perPersonVisitDiffsGraph.pointCount;
        ++perPersonVisitPercentChangeGraph.pointCount;
        ++perPersonVisitAddedPercentGraph.pointCount;
        priorSpeciesCount = point.y;
      }
    }

    return {
      locationCount,
      perVisitTotalsGraph,
      perPersonVisitTotalsGraph,
      perVisitDiffsGraph,
      perPersonVisitDiffsGraph,
      perVisitAddedPercentGraph,
      perPersonVisitAddedPercentGraph,
      perVisitPercentChangeGraph,
      perPersonVisitPercentChangeGraph
    };
  }

  const clearData = () => {
    clusterStore.set(null);
    graphStore.set(null);
    location.reload();
  };
</script>

<DataTabRoute activeTab="Sampling">
  <div class="container-fluid">
    <TabHeader title="Sampling Effort" instructions="Instructions TBD">
      <span slot="main-buttons">
        {#if $graphStore != null}
          <button class="btn btn-minor" type="button" on:click={clearData}
            >Clear Data</button
          >
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
          <div class="btn-group" role="group" aria-label="Basis for model">
            <input
              type="radio"
              class="btn-check"
              bind:group={basisID}
              name="dataset"
              id={BasisID.totals}
              value={BasisID.totals}
            />
            <label class="btn btn-outline-primary" for={BasisID.totals}>Totals</label>
            <input
              type="radio"
              class="btn-check"
              bind:group={basisID}
              name="dataset"
              id={BasisID.diffs}
              value={BasisID.diffs}
            />
            <label class="btn btn-outline-primary" for={BasisID.diffs}>Diffs</label>
            <input
              type="radio"
              class="btn-check"
              bind:group={basisID}
              name="dataset"
              id={BasisID.addedPercent}
              value={BasisID.addedPercent}
            />
            <label class="btn btn-outline-primary" for={BasisID.addedPercent}
              >Added %</label
            >
            <input
              type="radio"
              class="btn-check"
              bind:group={basisID}
              name="dataset"
              id={BasisID.percentChange}
              value={BasisID.percentChange}
            />
            <label class="btn btn-outline-primary" for={BasisID.percentChange}
              >% Change</label
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
        {@const graphData =
          basisID == BasisID.totals
            ? showingPersonVisits
              ? clusterGraphData.perPersonVisitTotalsGraph
              : clusterGraphData.perVisitTotalsGraph
            : basisID == BasisID.diffs
            ? showingPersonVisits
              ? clusterGraphData.perPersonVisitDiffsGraph
              : clusterGraphData.perVisitDiffsGraph
            : basisID == BasisID.addedPercent
            ? showingPersonVisits
              ? clusterGraphData.perPersonVisitAddedPercentGraph
              : clusterGraphData.perVisitAddedPercentGraph
            : showingPersonVisits
            ? clusterGraphData.perPersonVisitPercentChangeGraph
            : clusterGraphData.perVisitPercentChangeGraph}
        <div class="row mb-2">
          <div class="col">
            <Scatter
              data={{
                datasets: [
                  {
                    label: graphData.pointCount + ' points',
                    data: graphData.points
                  }
                ]
              }}
              options={{
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: graphData.xAxisLabel,
                      font: { size: 16 }
                    }
                  },
                  y: {
                    title: {
                      display: true,
                      text: graphData.yAxisLabel,
                      font: { size: 16 }
                    }
                  }
                },
                plugins: {
                  title: {
                    display: true,
                    text: `#${i + 1}: ` + graphData.graphTitle,
                    font: { size: 17 }
                  }
                },
                animation: {
                  duration: 0
                }
              }}
            />
          </div>
        </div>
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
