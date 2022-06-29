<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  import type { TimeGraphData, TimeGraphQuery } from '../../shared/time_query';

  export const cachedData = writable<TimeGraphData | null>(null);
</script>

<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import TimeFilterDialog, {
    type TimeGraphQueryRequest
  } from '../dialogs/TimeFilterDialog.svelte';
  import { pageName } from '../stores/pageName';
  import { selectedLocations } from '../stores/selectedLocations';
  import { selectedTaxa } from '../stores/selectedTaxa';
  import type { QueryDateFilter } from '../../shared/general_query';
  import { EARLIEST_RECORD_DATE } from '../../shared/general_query';

  $pageName = 'Time';

  let queryRequest: TimeGraphQueryRequest | null = null;

  function clearQuery() {
    $cachedData = null;
  }

  function createNewQuery() {
    if ($cachedData) {
      const query = $cachedData.query;
      queryRequest = {
        fromDateMillis: query.fromDateMillis,
        throughDateMillis: query.throughDateMillis,
        filterTaxa: query.taxonFilter !== null,
        filterLocations: query.locationFilter !== null
      };
    } else {
      queryRequest = {
        fromDateMillis: EARLIEST_RECORD_DATE.getTime(),
        throughDateMillis: new Date().getTime(),
        filterTaxa: false,
        filterLocations: false
      };
    }
  }

  function performQuery(request: TimeGraphQueryRequest) {
    queryRequest = request;
  }
</script>

<DataTabRoute activeTab="Time">
  <div class="container-fluid">
    <TabHeader
      title={$pageName}
      center={false}
      instructions="Specify the optional filters for new charts using the <a href='/taxa'>Taxa</a> and <a href='/locations'>Locations</a> tabs."
    >
      <span slot="main-buttons">
        <button class="btn btn-minor" type="button" on:click={clearQuery}>Clear</button>
        <button class="btn btn-major" type="button" on:click={createNewQuery}
          >Generate</button
        >
      </span>
    </TabHeader>
  </div>
  {#if !$cachedData}
    <EmptyTab message={'Click the "Generate" button to generate new charts.'} />
  {:else}
    charts
  {/if}
</DataTabRoute>

{#if queryRequest !== null}
  <TimeFilterDialog
    initialQueryRequest={queryRequest}
    onSubmit={performQuery}
    onClose={() => (queryRequest = null)}
  />
{/if}
