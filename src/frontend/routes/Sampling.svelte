<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';

  interface Point {
    x: number;
    y: number;
  }

  interface EffortData {
    perVisitPoints: Point[];
    perPersonVisitPoints: Point[];
  }

  const effortData = createSessionStore<EffortData | null>('effort_data', null);
</script>

<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import BusyMessage from '../common/BusyMessage.svelte';
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';
  import { showNotice } from '../common/VariableNotice.svelte';
  import { type EffortPoints, sortPointsXThenY } from '../../shared/model';
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
    let res = await $client.post('api/effort/get_points');
    loadState = LoadState.processing;
    const points: EffortPoints = res.data.points;
    if (!points) {
      showNotice({ message: 'Failed to load points' });
    } else {
      effortData.set({
        perVisitPoints: sortPointsXThenY(
          points.perVisitEffort,
          points.speciesCounts
        ).map(pairToPoint),
        perPersonVisitPoints: sortPointsXThenY(
          points.perPersonVisitEffort,
          points.speciesCounts
        ).map(pairToPoint)
      });
      loadState = LoadState.ready;
    }
  };
</script>

<DataTabRoute activeTab="Sampling">
  <div class="container-fluid">
    <TabHeader title="Sampling Effort" instructions="Instructions TBD">
      <span slot="main-buttons">
        {#if $effortData != null}
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

    {#if $effortData === null}
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
                ? $effortData.perPersonVisitPoints
                : $effortData.perVisitPoints
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

{#if $effortData === null}
  {#if loadState == LoadState.loading}
    <BusyMessage message="Loading points..." />
  {:else if loadState == LoadState.processing}
    <BusyMessage message="Processing points..." />
  {/if}
{/if}
