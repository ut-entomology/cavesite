<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';

  import { EffortData, loadSeeds, loadEffort } from '../lib/effort_data';
  import {
    type EffortGraphSpec,
    SpeciesByVisitsGraphSpec,
    SpeciesByPersonVisitsGraphSpec
  } from '../lib/effort_graphs';

  interface ClusterData {
    locationCount: number;
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
  import { QuadraticModel, PowerModel } from '../lib/linear_regression';
  import { pageName } from '../stores/pageName';

  $pageName = 'Collection Effort';

  const MAX_CLUSTERS = 5;
  const MIN_POINTS_TO_REGRESS = 3;
  const MIN_PERSON_VISITS = 0;

  const CLUSTER_SPEC: ClusterSpec = {
    metric: {
      basis: DissimilarityBasis.diffMinusCommonTaxa,
      transform: DissimilarityTransform.none,
      weight: TaxonWeight.weighted
    },
    comparedTaxa: ComparedTaxa.generaHavingCaveObligates,
    ignoreSubgenera: false,
    minSpecies: 0,
    maxSpecies: 10000
  };

  enum LoadState {
    idle,
    determiningSeeds,
    loadingEffort,
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

  async function loadPoints() {
    try {
      loadState = LoadState.determiningSeeds;
      const seedLocations = await loadSeeds($client, CLUSTER_SPEC, MAX_CLUSTERS);

      loadState = LoadState.loadingEffort;
      const effortDataByCluster = await loadEffort(
        $client,
        CLUSTER_SPEC,
        ComparedTaxa.all,
        seedLocations,
        MIN_PERSON_VISITS
      );
      effortStore.set(effortDataByCluster);

      loadState = LoadState.processing;
      const clusterDataByCluster: ClusterData[] = [];
      for (const effortData of effortDataByCluster) {
        clusterDataByCluster.push({
          locationCount: effortData.length,
          perVisitTotalsGraph: new SpeciesByVisitsGraphSpec(effortData),
          perPersonVisitTotalsGraph: new SpeciesByPersonVisitsGraphSpec(effortData)
        });
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

  function _getGraphData(clusterData: ClusterData) {
    return showingPersonVisits
      ? clusterData.perPersonVisitTotalsGraph
      : clusterData.perVisitTotalsGraph;
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
      <button class="btn btn-major" type="button" on:click={loadPoints}
        >Load Data</button
      >
    {:else}
      {#each $clusterStore as clusterData, i}
        {@const multipleClusters = $clusterStore && $clusterStore.length > 1}
        {@const graphData = _getGraphData(clusterData)}
        {@const graphTitle =
          (multipleClusters ? `#${i + 1}: ` : '') + graphData.graphTitle}
        {#if graphData.points.length >= MIN_POINTS_TO_REGRESS}
          {@const powerFit = new PowerModel('FF0088', graphData.points)}
          {@const quadraticFit = new QuadraticModel('00DCD8', graphData.points)}
          <div class="row mt-3 mb-1">
            <div class="col" style="height: 350px">
              <EffortGraph
                title={graphTitle}
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
  {:else if loadState == LoadState.loadingEffort}
    <BusyMessage message="Loading points..." />
  {:else if loadState == LoadState.processing}
    <BusyMessage message="Processing points..." />
  {/if}
{/if}
