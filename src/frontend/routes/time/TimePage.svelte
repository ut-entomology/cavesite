<script lang="ts" context="module">
  import { createSessionStore } from '../../util/session_store';

  import {
    type TimeGraphQuery,
    convertTimeQuery,
    TimeChartTallier,
    LifeStage
  } from '../../../shared/time_query';
  import {
    type TimeGraphSpec,
    createHistoryGraphSpec,
    createSeasonalityGraphSpec
  } from '../../lib/time_graphs';

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
    version: number;
    description: string;
    query: TimeGraphQuery;
    allTaxaHistoryGraphSpecs: HistoryGraphSpecs | null;
    historyGraphSpecs: HistoryGraphSpecs;
    seasonalityGraphSpecs: SeasonalityGraphSpecs;
    recordsMissingDates: number;
    recordsMissingMonth: number;
    recordsMissingDayOfMonth: number;
  }

  export const cachedData = createSessionStore<TimeGraphData | null>('time_data', null);
</script>

<script lang="ts">
  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import EmptyTab from '../../components/EmptyTab.svelte';
  import BusyMessage from '../../common/BusyMessage.svelte';
  import TimeFilterDialog, {
    type TimeGraphQueryRequest
  } from './TimeFilterDialog.svelte';
  import SeasonalityGraph from './SeasonalityGraph.svelte';
  import HistoryGraph from './HistoryGraph.svelte';
  import SectionFootnotes from '../../components/SectionFootnotes.svelte';
  import TabFootnotes from '../../components/TabFootnotes.svelte';
  import { pageName } from '../../stores/pageName';
  import { showNotice } from '../../common/VariableNotice.svelte';
  import type { GeneralQuery, QueryRow } from '../../../shared/general_query';
  import { EARLIEST_RECORD_DATE } from '../../../shared/general_query';
  import { getLocationFilter, getTaxonFilter } from '../../lib/query_filtering';
  import { client, errorReason } from '../../stores/client';
  import { selectedTaxa } from '../../stores/selectedTaxa';
  import { selectedLocations } from '../../stores/selectedLocations';
  import { LocationRank } from '../../../shared/model';

  $pageName = 'Seasonality and History';
  const tabName = 'Time';

  const CACHED_DATA_VERSION = 5;

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

  let loading = false;
  let seasonalityXUnits = SeasonalityXUnits.monthly;
  let historyXUnits = HistoryXUnits.yearly;
  let queryRequest: TimeGraphQueryRequest | null = null;
  let historyGraphSpec: TimeGraphSpec;
  let seasonalityGraphSpec: TimeGraphSpec;
  let allTaxaHistoryGraphSpec: TimeGraphSpec | null;
  let seasonalityFootnotes: string[];
  let historyFootnotes: string[];

  $: if ($cachedData && $cachedData.version != CACHED_DATA_VERSION) {
    $cachedData = null;
  }

  $: if ($cachedData) {
    const dateExclusionNote =
      $cachedData.recordsMissingDates > 0
        ? $cachedData.recordsMissingDates +
          ' records were excluded for not having dates'
        : null;
    const monthExclusionNote =
      $cachedData.recordsMissingMonth > 0
        ? $cachedData.recordsMissingMonth +
          ' records were excluded for not indicating month'
        : null;
    const dayOfMonthExclusionNote =
      $cachedData.recordsMissingDayOfMonth > 0
        ? $cachedData.recordsMissingDayOfMonth +
          ' records were excluded for not indicating day of month'
        : null;

    seasonalityGraphSpec = _getSeasonalityGraphSpec(
      seasonalityXUnits,
      seasonalityYUnits
    );
    seasonalityFootnotes = [];
    if (dateExclusionNote) {
      seasonalityFootnotes.push(dateExclusionNote);
    }
    if (monthExclusionNote) {
      seasonalityFootnotes.push(monthExclusionNote);
    }
    if (seasonalityXUnits != SeasonalityXUnits.monthly && dayOfMonthExclusionNote) {
      seasonalityFootnotes.push(dayOfMonthExclusionNote);
    }

    historyGraphSpec = _getHistoryGraphSpec(historyXUnits, historyYUnits);
    historyFootnotes = [];
    if (dateExclusionNote) {
      historyFootnotes.push(dateExclusionNote);
    }
    if (historyXUnits != HistoryXUnits.yearly && monthExclusionNote) {
      historyFootnotes.push(monthExclusionNote);
    }
    if (historyXUnits == HistoryXUnits.seasonally && dayOfMonthExclusionNote) {
      historyFootnotes.push(dayOfMonthExclusionNote);
    }

    allTaxaHistoryGraphSpec = _getAllTaxaHistoryGraphSpec(historyXUnits, historyYUnits);
  }

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
    // Construct a general query for the provided specifications, and construct
    // a general query based on the specified query but including all taxa.

    const allTaxaTimeQuery = {
      fromDateMillis: request.fromDateMillis,
      throughDateMillis: request.throughDateMillis,
      locationFilter: request.filterLocations ? await getLocationFilter() : null,
      taxonFilter: null
    };
    const specedTimeQuery = Object.assign({}, allTaxaTimeQuery, {
      taxonFilter: request.filterTaxa ? await getTaxonFilter() : null
    });
    queryRequest = null; // hide query request dialog
    const allTaxaQuery = convertTimeQuery(allTaxaTimeQuery, true, false);
    const specedQuery = convertTimeQuery(specedTimeQuery, false, false);

    // Generate the title.

    let taxonFilterName = 'All cave obligates';
    if (specedQuery.taxonFilter) {
      taxonFilterName = 'Selected taxa';
      const taxonSpecs = Object.values($selectedTaxa!);
      if (taxonSpecs.length == 1) {
        const taxonFilter = specedQuery.taxonFilter;
        taxonFilterName = taxonSpecs[0].unique;
        if (
          taxonFilter.subspeciesIDs ||
          taxonFilter.speciesIDs ||
          taxonFilter.genusIDs
        ) {
          taxonFilterName = `<i>${taxonFilterName}</i>`;
        }
      }
    }

    let locationFilterName = 'at all locations';
    if (specedQuery.locationFilter) {
      locationFilterName = 'at selected locations';
      const locationSpecs = Object.values($selectedLocations!);
      if (locationSpecs.length == 1) {
        const locationSpec = locationSpecs[0];
        locationFilterName = `in ${locationSpec.name}`;
        if (locationSpec.rank == LocationRank.Locality) {
          const parentNames = locationSpec.parentNamePath.split('|');
          locationFilterName = `at ${locationSpec.name}, ${
            parentNames[parentNames.length - 1]
          }`;
        }
      }
    }

    const fromDate = new Date(specedQuery.dateFilter!.fromDateMillis!);
    const thruDate = new Date(specedQuery.dateFilter!.throughDateMillis!);
    let description =
      `${taxonFilterName} ${locationFilterName}<br/>` +
      `from ${fromDate.toLocaleDateString()} through ${thruDate.toLocaleDateString()}`;

    // Get a count of the number of blank dates in the filtered set.

    const blankDateQuery = convertTimeQuery(specedTimeQuery, false, true);
    const recordsMissingDates =
      (await _loadBatch(blankDateQuery, 0))[0]?.recordCount! || 0;

    // Tally the data for the charts.

    loading = true;
    const specedTallier = await _loadTallies(specedQuery);
    const historyStageTallies = specedTallier.getHistoryStageTallies();
    const seasonalityStageTallies = specedTallier.getSeasonalityStageTallies();
    const recordsMissingMonth = specedTallier.missingMonthExclusions;
    const recordsMissingDayOfMonth = specedTallier.missingDayExclusions;

    let allTaxaHistoryGraphSpecs: HistoryGraphSpecs | null = null;
    if (specedQuery.locationFilter) {
      const allTaxaTallier = await _loadTallies(allTaxaQuery);
      const allTaxaMaxTallies = allTaxaTallier.getHistoryStageTallies();
      const allTaxaAllStagesTallies = allTaxaMaxTallies[LifeStage.All];

      _setAllTaxaTallies(
        allTaxaAllStagesTallies.monthlySpeciesTotals,
        historyStageTallies[LifeStage.All].monthlySpeciesTotals
      );
      _setAllTaxaTallies(
        allTaxaAllStagesTallies.seasonalSpeciesTotals,
        historyStageTallies[LifeStage.All].seasonalSpeciesTotals
      );
      _setAllTaxaTallies(
        allTaxaAllStagesTallies.yearlySpeciesTotals,
        historyStageTallies[LifeStage.All].yearlySpeciesTotals
      );

      allTaxaHistoryGraphSpecs = {
        monthlySpecs: {
          species: createHistoryGraphSpec(allTaxaMaxTallies, 'monthlySpeciesTotals'),
          specimens: null! // unused
        },
        seasonalSpecs: {
          species: createHistoryGraphSpec(allTaxaMaxTallies, 'seasonalSpeciesTotals'),
          specimens: null! // unused
        },
        yearlySpecs: {
          species: createHistoryGraphSpec(allTaxaMaxTallies, 'yearlySpeciesTotals'),
          specimens: null! // unused
        }
      };
    }
    loading = false;

    // Cache the data.

    cachedData.set({
      version: CACHED_DATA_VERSION,
      description,
      query: specedTimeQuery,
      allTaxaHistoryGraphSpecs,
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
      },
      recordsMissingDates,
      recordsMissingMonth,
      recordsMissingDayOfMonth
    });
  }

  async function _loadBatch(query: GeneralQuery, offset: number): Promise<QueryRow[]> {
    try {
      let res = await $client.post('api/specimen/query', {
        query,
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

  async function _loadTallies(query: GeneralQuery) {
    const tallier = new TimeChartTallier();
    let offset = 0;
    let done = false;
    while (!done) {
      const rows = await _loadBatch(query, offset);
      for (const row of rows) {
        tallier.addTimeQueryRow(row);
      }
      offset += TIME_QUERY_BATCH_SIZE;
      done = rows.length == 0;
    }
    return tallier;
  }

  function _getAllTaxaHistoryGraphSpec(
    xUnits: HistoryXUnits,
    yUnits: CountUnits
  ): TimeGraphSpec | null {
    const allTaxaHistoryGraphSpecs = $cachedData!.allTaxaHistoryGraphSpecs;
    if (!allTaxaHistoryGraphSpecs || yUnits == CountUnits.specimens) return null;
    switch (xUnits) {
      case HistoryXUnits.monthly:
        return allTaxaHistoryGraphSpecs.monthlySpecs.species;
      case HistoryXUnits.seasonally:
        return allTaxaHistoryGraphSpecs.seasonalSpecs.species;
      case HistoryXUnits.yearly:
        return allTaxaHistoryGraphSpecs.yearlySpecs.species;
    }
  }

  function _getHistoryGraphSpec(
    xUnits: HistoryXUnits,
    yUnits: CountUnits
  ): TimeGraphSpec {
    const historyGraphSpecs = $cachedData!.historyGraphSpecs;
    const getYData =
      yUnits == CountUnits.species
        ? (specPair: TimeGraphSpecPair) => specPair.species
        : (specPair: TimeGraphSpecPair) => specPair.specimens;

    switch (xUnits) {
      case HistoryXUnits.monthly:
        return getYData(historyGraphSpecs.monthlySpecs);
      case HistoryXUnits.seasonally:
        return getYData(historyGraphSpecs.seasonalSpecs);
      case HistoryXUnits.yearly:
        return getYData(historyGraphSpecs.yearlySpecs);
    }
  }

  function _getSeasonalityGraphSpec(
    xUnits: SeasonalityXUnits,
    yUnits: CountUnits
  ): TimeGraphSpec {
    const seasonalityGraphSpecs = $cachedData!.seasonalityGraphSpecs;
    const getYData =
      yUnits == CountUnits.species
        ? (specPair: TimeGraphSpecPair) => specPair.species
        : (specPair: TimeGraphSpecPair) => specPair.specimens;

    switch (xUnits) {
      case SeasonalityXUnits.weekly:
        return getYData(seasonalityGraphSpecs.weeklySpecs);
      case SeasonalityXUnits.biweekly:
        return getYData(seasonalityGraphSpecs.biweeklySpecs);
      case SeasonalityXUnits.monthly:
        return getYData(seasonalityGraphSpecs.monthlySpecs);
      case SeasonalityXUnits.seasonally:
        return getYData(seasonalityGraphSpecs.seasonalSpecs);
    }
  }

  function _setAllTaxaTallies(
    allTaxaTallies: number[],
    graphedTallies: number[]
  ): void {
    let maxGraphedTally = 0;
    for (const graphedTally of graphedTallies) {
      if (graphedTally > maxGraphedTally) maxGraphedTally = graphedTally;
    }
    for (const xStr of Object.keys(allTaxaTallies)) {
      const x = parseInt(xStr);
      if (allTaxaTallies[x] > 0) allTaxaTallies[x] = maxGraphedTally;
    }
  }
</script>

<DataTabRoute activeTab={tabName}>
  <svelte:fragment slot="body">
    <div class="container-fluid mb-3">
      <TabHeader {tabName} title={$pageName} center={false}>
        <span slot="instructions"
          >Use the <a href="/taxa">Taxa</a> and <a href="/locations">Locations</a> tabs to
          specify the optional filters to use when loading data. Click on the colored boxes
          in a chart's legend to hide and show particular life stages. See the notes at the
          bottom for important caveats.</span
        >
        <span slot="main-buttons">
          {#if $cachedData}
            <button class="btn btn-minor" type="button" on:click={clearData}
              >Clear</button
            >
          {/if}
          <button class="btn btn-major" type="button" on:click={loadData}
            >{$cachedData ? 'Change' : 'Load'} Data</button
          >
        </span>
      </TabHeader>
      {#if !$cachedData}
        <EmptyTab message={'Click the "Load Data" button to generate new charts.'} />
      {:else}
        <div class="row mt-3 mb-3 justify-content-center description">
          <div class="col-10">{@html $cachedData.description}</div>
        </div>

        <hr style="margin-top: 1rem" />

        <div class="row justify-content-center mt-4 gx-3">
          <div class="col-auto chart_type">Seasonality</div>
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
              <label class="btn btn-outline-primary" for="seasonalitySpecies"
                >Species</label
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
          </div>
          <div class="col-auto">
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
              <label class="btn btn-outline-primary" for="seasonalityMonthly"
                >Monthly</label
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
              <label class="btn btn-outline-primary" for="seasonalityWeekly"
                >Weekly</label
              >
            </div>
          </div>
        </div>
        <div class="row mt-3 time_graph">
          <div class="col">
            <SeasonalityGraph spec={seasonalityGraphSpec} />
          </div>
        </div>
        {#if seasonalityFootnotes.length > 0}
          <SectionFootnotes>
            {#each seasonalityFootnotes as footnote}
              <li>{footnote}</li>
            {/each}
          </SectionFootnotes>
        {/if}

        <hr style="margin-top: 2rem" />

        <div class="row justify-content-center mt-4 gx-3">
          <div class="col-auto chart_type">History</div>
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
              <label class="btn btn-outline-primary" for="historySpecies">Species</label
              >
              <input
                type="radio"
                class="btn-check"
                bind:group={historyYUnits}
                name="historyYUnits"
                id="historySpecimens"
                value={CountUnits.specimens}
              />
              <label class="btn btn-outline-primary" for="historySpecimens"
                >Specimens</label
              >
            </div>
          </div>
          <div class="col-auto">
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
              <label class="btn btn-outline-primary" for="historyMonthly">Monthly</label
              >
            </div>
          </div>
        </div>
        <div class="row mt-3 time_graph">
          <div class="col">
            <div class="time_graph">
              <HistoryGraph
                spec={historyGraphSpec}
                backgroundSpec={allTaxaHistoryGraphSpec}
              />
            </div>
          </div>
        </div>
        {#if historyFootnotes.length > 0}
          <SectionFootnotes>
            {#each historyFootnotes as footnote}
              <li>{footnote}</li>
            {/each}
          </SectionFootnotes>
        {/if}

        <hr />
      {/if}
      <TabFootnotes>
        <li>Blank and zero specimen counts are counted as single specimens.</li>
        <li>
          The counts of specimens collected over a range of days are evenly distributed
          across those days, allowing for fractional specimen counts.
        </li>
        <li>
          Species collected over a range of days are each randomly assigned to a date
          within the range, which may cause species charts to vary slightly from load to
          load.
        </li>
        <li>
          "Min. species" is the minimum number of species represented. For example,
          after counting a record for <i>Hahnia</i>, the first occurrence of a species
          in this genus (e.g. <i>Hahnia flaviceps</i>) does not increase the count,
          while subsequent occurrences of additional species in the genus do increase
          the count.
        </li>
        <li>
          In weekly and biweekly charts, the one or two days of the 53rd week are
          stacked onto the 52nd week.
        </li>
        <li>
          In graphs showing species history for selected locations, the grayed backround
          (labeled 'visits') indicates that at least one visit was made to the location
          during the specified time period.
        </li>
      </TabFootnotes>
    </div>
  </svelte:fragment>
</DataTabRoute>

{#if loading}
  <BusyMessage message="Loading data..." />
{/if}

{#if queryRequest !== null}
  <TimeFilterDialog
    initialQueryRequest={queryRequest}
    onSubmit={performQuery}
    onClose={() => (queryRequest = null)}
  />
{/if}

<style>
  .description {
    text-align: center;
    font-weight: bold;
    font-size: 1.1rem;
  }
  .chart_type {
    font-size: 1.1rem;
    font-weight: bold;
  }
  .btn-group label {
    font-size: 0.9em;
  }
  .time_graph {
    height: 400px;
  }
</style>
