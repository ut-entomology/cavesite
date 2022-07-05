<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  import {
    type TimeGraphQuery,
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
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import TimeFilterDialog, {
    type TimeGraphQueryRequest
  } from '../dialogs/TimeFilterDialog.svelte';
  import TimeGraph from '../components/TimeGraph.svelte';
  import { pageName } from '../stores/pageName';
  import { showNotice } from '../common/VariableNotice.svelte';
  import type { GeneralQuery, QueryRow } from '../../shared/general_query';
  import { EARLIEST_RECORD_DATE } from '../../shared/general_query';
  import { getLocationFilter, getTaxonFilter } from '../lib/query_filtering';
  import { client, errorReason } from '../stores/client';

  $pageName = 'Time';

  enum CountUnits {
    species = 'species',
    specimens = 'specimens'
  }
  let seasonalityYUnits = CountUnits.species;
  let historyYUnits = CountUnits.species;

  enum SeasonalityXUnits {
    weekly = 'weekly',
    biweekly = 'biweekly',
    monthly = 'monthly',
    seasonally = 'seasonally'
  }

  enum HistoryXUnits {
    monthly = 'monthly',
    seasonally = 'seasonally',
    yearly = 'yearly'
  }

  const TIME_QUERY_BATCH_SIZE = 500;

  let seasonalityXUnits = SeasonalityXUnits.monthly;
  let historyXUnits = HistoryXUnits.seasonally;
  let queryRequest: TimeGraphQueryRequest | null = null;

  function clearData() {
    $cachedData = null;
  }

  function loadData() {
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

  function _getHistoryGraphSpec(
    xUnits: HistoryXUnits,
    yUnits: CountUnits
  ): TimeGraphSpec {
    const getYData =
      yUnits == CountUnits.species
        ? (specPair: TimeGraphSpecPair) => specPair.species
        : (specPair: TimeGraphSpecPair) => specPair.specimens;

    switch (xUnits) {
      case HistoryXUnits.monthly:
        return getYData($cachedData!.historyGraphSpecs.monthlySpecs);
      case HistoryXUnits.seasonally:
        return getYData($cachedData!.historyGraphSpecs.seasonalSpecs);
      case HistoryXUnits.yearly:
        return getYData($cachedData!.historyGraphSpecs.yearlySpecs);
    }
  }

  function _getSeasonalityGraphSpec(
    xUnits: SeasonalityXUnits,
    yUnits: CountUnits
  ): TimeGraphSpec {
    const getYData =
      yUnits == CountUnits.species
        ? (specPair: TimeGraphSpecPair) => specPair.species
        : (specPair: TimeGraphSpecPair) => specPair.specimens;

    switch (xUnits) {
      case SeasonalityXUnits.weekly:
        return getYData($cachedData!.seasonalityGraphSpecs.weeklySpecs);
      case SeasonalityXUnits.biweekly:
        return getYData($cachedData!.seasonalityGraphSpecs.biweeklySpecs);
      case SeasonalityXUnits.monthly:
        return getYData($cachedData!.seasonalityGraphSpecs.monthlySpecs);
      case SeasonalityXUnits.seasonally:
        return getYData($cachedData!.seasonalityGraphSpecs.seasonalSpecs);
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
        <button class="btn btn-minor" type="button" on:click={clearData}>Clear</button>
        <button class="btn btn-major" type="button" on:click={loadData}
          >{$cachedData ? 'Change' : 'Load'} Data</button
        >
      </span>
    </TabHeader>
  </div>
  {#if !$cachedData}
    <EmptyTab message={'Click the "Load Data" button to generate new charts.'} />
  {:else}
    <div class="row justify-content-center">
      <div class="col-auto">
        <div class="btn-group" role="group" aria-label="Seasonality count units">
          <input
            type="radio"
            class="btn-check"
            bind:group={seasonalityYUnits}
            name="seasonalityYUnits"
            id="seasonalitySpecies"
            value={CountUnits.species}
          />
          <label class="btn btn-outline-primary" for="seasonalitySpecies">Species</label
          >
          <input
            type="radio"
            class="btn-check"
            bind:group={seasonalityYUnits}
            name="seasonalityYUnits"
            id="seasonalitySpecimens"
            value={CountUnits.specimens}
          />
          <label class="btn btn-outline-primary" for="seasonalitySpecimens"
            >Specimens</label
          >
        </div>
        <div class="btn-group" role="group" aria-label="Seasonality units of time">
          <input
            type="radio"
            class="btn-check"
            bind:group={seasonalityXUnits}
            name="seasonalityXUnits"
            id="seasonalitySeasonal"
            value={SeasonalityXUnits.seasonally}
          />
          <label class="btn btn-outline-primary" for="seasonalitySeasonal"
            >Seasonally</label
          >
          <input
            type="radio"
            class="btn-check"
            bind:group={seasonalityXUnits}
            name="seasonalityXUnits"
            id="seasonalityMonthly"
            value={SeasonalityXUnits.monthly}
          />
          <label class="btn btn-outline-primary" for="seasonalityMonthly">Monthly</label
          >
          <input
            type="radio"
            class="btn-check"
            bind:group={seasonalityXUnits}
            name="seasonalityXUnits"
            id="seasonalityBiweekly"
            value={SeasonalityXUnits.biweekly}
          />
          <label class="btn btn-outline-primary" for="seasonalityBiweekly"
            >Biweekly</label
          >
          <input
            type="radio"
            class="btn-check"
            bind:group={seasonalityXUnits}
            name="seasonalityXUnits"
            id="seasonalityWeekly"
            value={SeasonalityXUnits.weekly}
          />
          <label class="btn btn-outline-primary" for="seasonalityWeekly">Weekly</label>
        </div>
      </div>
    </div>
    <div class="time_graph">
      <TimeGraph
        spec={_getSeasonalityGraphSpec(seasonalityXUnits, seasonalityYUnits)}
      />
    </div>

    <div class="row justify-content-center">
      <div class="col-auto">
        <div class="btn-group" role="group" aria-label="History count units">
          <input
            type="radio"
            class="btn-check"
            bind:group={historyYUnits}
            name="historyYUnits"
            id="historySpecies"
            value={CountUnits.species}
          />
          <label class="btn btn-outline-primary" for="historySpecies">Species</label>
          <input
            type="radio"
            class="btn-check"
            bind:group={historyYUnits}
            name="historyYUnits"
            id="historySpecimens"
            value={CountUnits.specimens}
          />
          <label class="btn btn-outline-primary" for="historySpecimens">Specimens</label
          >
        </div>
        <div class="btn-group" role="group" aria-label="History units of time">
          <input
            type="radio"
            class="btn-check"
            bind:group={historyXUnits}
            name="historyXUnits"
            id="historyYearly"
            value={HistoryXUnits.yearly}
          />
          <label class="btn btn-outline-primary" for="historyYearly">Yearly</label>
          <input
            type="radio"
            class="btn-check"
            bind:group={historyXUnits}
            name="historyXUnits"
            id="historySeasonally"
            value={HistoryXUnits.seasonally}
          />
          <label class="btn btn-outline-primary" for="historySeasonally"
            >Seasonally</label
          >
          <input
            type="radio"
            class="btn-check"
            bind:group={historyXUnits}
            name="historyXUnits"
            id="historyMonthly"
            value={HistoryXUnits.monthly}
          />
          <label class="btn btn-outline-primary" for="historyMonthly">Monthly</label>
        </div>
      </div>
    </div>
    <div class="time_graph">
      <TimeGraph spec={_getHistoryGraphSpec(historyXUnits, historyYUnits)} />
    </div>
  {/if}
</DataTabRoute>

{#if queryRequest !== null}
  <TimeFilterDialog
    initialQueryRequest={queryRequest}
    onSubmit={performQuery}
    onClose={() => (queryRequest = null)}
  />
{/if}

<style>
  .time_graph {
    height: 400px;
  }
</style>
