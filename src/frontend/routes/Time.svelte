<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  import {
    type TimeGraphQuery,
    LifeStage,
    convertTimeQuery,
    TimeChartTallier
  } from '../../shared/time_query';
  import {
    type TimeGraphSpec,
    createHistoryGraphSpec,
    createSeasonalityGraphSpec
  } from '../lib/time_graphs';

  interface TimeGraphSpecPair {
    species: TimeGraphSpec;
    specimens: TimeGraphSpec;
  }

  interface HistoryGraphSpecs {
    monthlySpecs: TimeGraphSpecPair;
    seasonalSpecs: TimeGraphSpecPair;
    yearlySpecs: TimeGraphSpecPair;
  }

  interface SeasonalityGraphSpecs {
    weeklySpecs: TimeGraphSpecPair;
    biweeklySpecs: TimeGraphSpecPair;
    monthlySpecs: TimeGraphSpecPair;
    seasonalSpecs: TimeGraphSpecPair;
  }

  interface TimeGraphData {
    query: TimeGraphQuery;
    historyGraphSpecs: HistoryGraphSpecs;
    seasonalityGraphSpecs: SeasonalityGraphSpecs;
  }

  export const cachedData = writable<TimeGraphData | null>(null);
</script>

<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import TimeFilterDialog, {
    type TimeGraphQueryRequest
  } from '../dialogs/TimeFilterDialog.svelte';
  import TimeGraph from '../components/TimeGraph.svelte';
  import { pageName } from '../stores/pageName';
  import { showNotice } from '../common/VariableNotice.svelte';
  import type {
    QueryDateFilter,
    GeneralQuery,
    QueryRow
  } from '../../shared/general_query';
  import { EARLIEST_RECORD_DATE } from '../../shared/general_query';
  import { getLocationFilter, getTaxonFilter } from '../lib/query_filtering';
  import { client, errorReason } from '../stores/client';

  $pageName = 'Time';

  const TIME_QUERY_BATCH_SIZE = 500;

  const xValues = [1500, 1600, 1700, 1750, 1800, 1850, 1900, 1950, 1999, 2050];
  const yValues = [86, 114, 106, 106, 107, 111, 133, 221, 783, 2478];
  const points = xValues.map((x, i) => {
    return { x, y: yValues[i] };
  });

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

  async function performQuery(request: TimeGraphQueryRequest) {
    const timeQuery = {
      fromDateMillis: request.fromDateMillis,
      throughDateMillis: request.throughDateMillis,
      locationFilter: request.filterLocations ? await getLocationFilter() : null,
      taxonFilter: request.filterTaxa ? await getTaxonFilter() : null
    };
    queryRequest = null; // hide query request dialog
    const generalQuery = convertTimeQuery(timeQuery);

    const tallier = new TimeChartTallier();

    let offset = 0;
    let done = false;
    while (!done) {
      const rows = await _loadBatch(generalQuery, offset);
      for (const row of rows) {
        tallier.addTimeQueryRow(row);
      }
      offset += TIME_QUERY_BATCH_SIZE;
      done = rows.length == 0;
    }

    // query: TimeGraphQuery;
    // historyGraphSpecs: HistoryGraphSpecs;
    // seasonalityGraphSpecs: SeasonalityGraphSpecs;

    const historyStageTallies = tallier.getHistoryStageTallies();
    const seasonalityStageTallies = tallier.getSeasonalityStageTallies();

    cachedData.set({
      query: timeQuery,
      historyGraphSpecs: {
        monthlySpecs: {
          species: createHistoryGraphSpec(historyStageTallies, 'monthlySpeciesTotals'),
          specimens: createHistoryGraphSpec(
            historyStageTallies,
            'monthlySpecimenTotals'
          )
        },
        seasonalSpecs: {
          species: createHistoryGraphSpec(historyStageTallies, 'seasonalSpeciesTotals'),
          specimens: createHistoryGraphSpec(
            historyStageTallies,
            'seasonalSpecimenTotals'
          )
        },
        yearlySpecs: {
          species: createHistoryGraphSpec(historyStageTallies, 'yearlySpeciesTotals'),
          specimens: createHistoryGraphSpec(historyStageTallies, 'yearlySpecimenTotals')
        }
      },
      seasonalityGraphSpecs: {
        weeklySpecs: {
          species: createSeasonalityGraphSpec(
            seasonalityStageTallies,
            'weeklySpeciesTotals'
          ),
          specimens: createSeasonalityGraphSpec(
            seasonalityStageTallies,
            'weeklySpecimenTotals'
          )
        },
        biweeklySpecs: {
          species: createSeasonalityGraphSpec(
            seasonalityStageTallies,
            'biweeklySpeciesTotals'
          ),
          specimens: createSeasonalityGraphSpec(
            seasonalityStageTallies,
            'biweeklySpecimenTotals'
          )
        },
        monthlySpecs: {
          species: createSeasonalityGraphSpec(
            seasonalityStageTallies,
            'monthlySpeciesTotals'
          ),
          specimens: createSeasonalityGraphSpec(
            seasonalityStageTallies,
            'monthlySpecimenTotals'
          )
        },
        seasonalSpecs: {
          species: createSeasonalityGraphSpec(
            seasonalityStageTallies,
            'seasonalSpeciesTotals'
          ),
          specimens: createSeasonalityGraphSpec(
            seasonalityStageTallies,
            'seasonalSpecimenTotals'
          )
        }
      }
    });
  }

  async function _loadBatch(
    generalQuery: GeneralQuery,
    offset: number
  ): Promise<QueryRow[]> {
    try {
      let res = await $client.post('api/specimen/query', {
        query: generalQuery,
        skip: offset,
        limit: TIME_QUERY_BATCH_SIZE
      });
      return res.data.rows;
    } catch (err: any) {
      showNotice({
        message: `Failed to load query results<br/><br/>` + errorReason(err.response),
        header: 'Error',
        alert: 'danger'
      });
      return [];
    }
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
    <Scatter
      data={{
        datasets: [
          {
            showLine: true,
            data: points,
            label: 'Africa',
            borderColor: '#3e95cd',
            fill: false
          }
        ]
      }}
      options={{
        title: {
          display: true,
          text: 'World population per region (in millions)'
        }
      }}
    />
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
