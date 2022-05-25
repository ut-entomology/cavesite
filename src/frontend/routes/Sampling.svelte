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

  interface GraphData {
    perVisitPoints: Point[];
    perPersonVisitPoints: Point[];
  }

  const clusterData = createSessionStore<EffortData[][] | null>('cluster_data', null);
  const graphData = createSessionStore<GraphData | null>('graph_data', null);
</script>

<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import BusyMessage from '../common/BusyMessage.svelte';
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';
  import { showNotice } from '../common/VariableNotice.svelte';
  import { type EffortResult, SeedType, type LocationSpec } from '../../shared/model';
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

  let loadState = LoadState.idle;
  let datasetID = DatasetID.personVisits;
  $: usePersonVisits = datasetID == DatasetID.personVisits;

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
    console.log('**** seed count', seeds.length);

    res = await $client.post('api/cluster/get_clusters', {
      seedIDs: seeds.map((location) => location.locationID)
    });
    const clusters: number[][] = res.data.clusters;
    if (!clusters) showNotice({ message: 'Failed to load clusters' });
    console.log('**** cluster count', clusters.length);

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
        console.log('****     clusterData size', clusterData.length);
      }
    }
    console.log('**** workingClusterData count', workingClusterData.length);

    workingClusterData.sort((a, b) => {
      if (a.length == b.length) return 0;
      return b.length - a.length; // sort most points first
    });

    clusterData.set(workingClusterData);
    loadState = LoadState.processing;
    _setGraphData(0);
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

  function _setGraphData(clusterIndex: number): void {
    if ($clusterData === null) throw Error("$clusterData shouldn't be null");
    const clusterEffortData = $clusterData[clusterIndex];
    const workingGraphData: GraphData = {
      perVisitPoints: [],
      perPersonVisitPoints: []
    };
    for (const effortData of clusterEffortData) {
      for (const point of effortData.perVisitPoints) {
        workingGraphData.perVisitPoints.push(point);
      }
      for (const point of effortData.perPersonVisitPoints) {
        workingGraphData.perPersonVisitPoints.push(point);
      }
    }
    console.log(
      '**** graph data lengths',
      workingGraphData.perVisitPoints.length,
      workingGraphData.perPersonVisitPoints.length
    );
    graphData.set(workingGraphData);
  }
</script>

<DataTabRoute activeTab="Sampling">
  <div class="container-fluid">
    <TabHeader title="Sampling Effort" instructions="Instructions TBD">
      <span slot="main-buttons">
        {#if $graphData != null}
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

    {#if $graphData === null}
      <button class="btn btn-major" type="button" on:click={loadPoints}
        >Load Data</button
      >
    {:else}
      <Scatter
        data={{
          datasets: [
            {
              label: 'data points',
              data: usePersonVisits
                ? $graphData.perPersonVisitPoints
                : $graphData.perVisitPoints
            }
          ]
        }}
        options={{
          scales: {
            x: {
              title: {
                display: true,
                text: usePersonVisits ? 'person-visits' : 'visits',
                font: { size: 16 }
              }
            },
            y: {
              title: {
                display: true,
                text: 'cumulative species',
                font: { size: 16 }
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text:
                'Cumulative Species across ' +
                (usePersonVisits ? 'Person-Visits' : 'Visits'),
              font: { size: 20 }
            }
          },
          animation: {
            duration: 0
          }
        }}
      />
    {/if}
  </div>
</DataTabRoute>

{#if $graphData === null}
  {#if loadState == LoadState.loading}
    <BusyMessage message="Loading points..." />
  {:else if loadState == LoadState.processing}
    <BusyMessage message="Processing points..." />
  {/if}
{/if}
