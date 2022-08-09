<script lang="ts" context="module">
  import MapFilterDialog, { type MapQueryRequest } from './MapFilterDialog.svelte';
  import KarstMap, { MapMarkerSpec } from '../../components/KarstMap.svelte';
  import {
    EARLIEST_RECORD_DATE,
    type GeneralQuery,
    type QueryColumnSpec,
    type QueryLocationFilter,
    type QueryTaxonFilter,
    type QueryRow,
    QueryColumnID
  } from '../../../shared/general_query';
  import { createSessionStore } from '../../util/session_store';

  export interface MapQuery {
    fromDateMillis: number;
    throughDateMillis: number;
    locationFilter: QueryLocationFilter | null;
    taxonFilter: QueryTaxonFilter | null;
    onlyCaveObligates: boolean;
  }

  interface FeatureSpec {
    label: string;
    latitude: number;
    longitude: number;
    recordCount: number;
    visitCount: number;
    lastDaysEpoch: number;
  }

  interface MapData {
    version: number;
    description: string;
    query: MapQuery;
    featureSpecs: FeatureSpec[];
  }

  const CACHED_DATA_VERSION = 2;
  const MAP_QUERY_BATCH_SIZE = 400;

  export const cachedData = createSessionStore<MapData | null>('map_data', null);
</script>

<script lang="ts">
  import ConfirmationRequest from '../../common/ConfirmationRequest.svelte';
  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import EmptyTab from '../../components/EmptyTab.svelte';
  import BusyMessage from '../../common/BusyMessage.svelte';
  import { pageName } from '../../stores/pageName';
  import { client, errorReason } from '../../stores/client';
  import { getLocationFilter, getTaxonFilter } from '../../lib/query_filtering';
  import { selectedTaxa } from '../../stores/selectedTaxa';
  import { selectedLocations } from '../../stores/selectedLocations';
  import { LocationRank } from '../../../shared/model';
  import { toDaysEpoch, fromDaysEpoch } from '../../../shared/time_query';
  import { showNotice } from '../../common/VariableNotice.svelte';

  $pageName = 'Map View';
  const tabName = 'Map';
  $: if ($cachedData && $cachedData.version != CACHED_DATA_VERSION) {
    $cachedData = null;
  }

  const ZERO_COLOR = [200, 200, 200];
  const RECORD_COUNT_COLOR = [220, 0, 0]; // red
  const VISIT_COUNT_COLOR = [160, 0, 255]; // violet
  const LAST_VISIT_COLOR = [0, 200, 0]; // lime
  const MAX_SCALE_DIVISIONS = 20;

  enum ColorMeaning {
    records = 'records',
    visits = 'visits',
    lastVisit = 'last_visit'
  }
  const currentDaysEpoch = toDaysEpoch(new Date());
  const toColorByColorMeaning = {
    records: (spec: FeatureSpec) => _toScaleColor(spec.recordCount, maxRecordCount),
    visits: (spec: FeatureSpec) => _toScaleColor(spec.visitCount, maxVisitCount),
    last_visit: (spec: FeatureSpec) =>
      _toScaleColor(
        spec.lastDaysEpoch - oldestDaysEpoch + 1,
        currentDaysEpoch - oldestDaysEpoch + 1
      ) // add 1 to prevent divide by 0
  };

  let loading = false;
  let queryRequest: MapQueryRequest | null = null;
  let requestClearConfirmation = false;
  let maxRecordCount: number;
  let maxVisitCount: number;
  let oldestDaysEpoch: number;
  let colorMeaning = ColorMeaning.visits;
  let rightRGB: number[];
  let scaleDivisions: string[];
  let scaleColors: string[];
  let markerSpecs: MapMarkerSpec[];

  $: if ($cachedData) {
    maxRecordCount = 0;
    maxVisitCount = 0;
    oldestDaysEpoch = Infinity;

    for (const featureSpec of $cachedData.featureSpecs) {
      if (featureSpec.recordCount > maxRecordCount) {
        maxRecordCount = featureSpec.recordCount;
      }
      if (featureSpec.visitCount > maxVisitCount) {
        maxVisitCount = featureSpec.visitCount;
      }
      if (featureSpec.lastDaysEpoch < oldestDaysEpoch) {
        oldestDaysEpoch = featureSpec.lastDaysEpoch;
      }
    }

    scaleDivisions = [];
    scaleColors = [];
    let scaleDivisionCount: number;
    let delta: number;
    switch (colorMeaning) {
      case ColorMeaning.records:
        rightRGB = RECORD_COUNT_COLOR;
        scaleDivisionCount =
          maxRecordCount >= MAX_SCALE_DIVISIONS ? MAX_SCALE_DIVISIONS : maxRecordCount;
        delta =
          scaleDivisionCount == 1 ? 1 : (maxRecordCount - 1) / (scaleDivisionCount - 1);
        for (let v = maxRecordCount; v >= 1; v -= delta) {
          const rounded = Math.round(v);
          scaleDivisions.push(rounded == 1 ? '1 record' : rounded + ' records');
          scaleColors.push(_toScaleColor(maxRecordCount + 1 - v, maxRecordCount));
        }
        scaleDivisions.reverse();
        break;
      case ColorMeaning.visits:
        rightRGB = VISIT_COUNT_COLOR;
        scaleDivisionCount =
          maxVisitCount >= MAX_SCALE_DIVISIONS ? MAX_SCALE_DIVISIONS : maxVisitCount;
        delta =
          scaleDivisionCount == 1 ? 1 : (maxVisitCount - 1) / (scaleDivisionCount - 1);
        for (let v = maxVisitCount; v >= 1; v -= delta) {
          const rounded = Math.round(v);
          scaleDivisions.push(rounded == 1 ? '1 visit' : rounded + ' visits');
          scaleColors.push(_toScaleColor(maxVisitCount + 1 - v, maxVisitCount));
        }
        scaleDivisions.reverse();
        break;
      case ColorMeaning.lastVisit:
        rightRGB = LAST_VISIT_COLOR;
        const spanOfDays = currentDaysEpoch - oldestDaysEpoch + 1;
        scaleDivisionCount =
          spanOfDays >= MAX_SCALE_DIVISIONS ? MAX_SCALE_DIVISIONS : spanOfDays;
        delta = scaleDivisionCount == 1 ? 1 : spanOfDays / (scaleDivisionCount - 1);
        for (let v = oldestDaysEpoch; Math.round(v) <= currentDaysEpoch; v += delta) {
          scaleDivisions.push(fromDaysEpoch(Math.round(v)).toLocaleDateString());
          scaleColors.push(
            _toScaleColor(
              v - oldestDaysEpoch + 1,
              currentDaysEpoch - oldestDaysEpoch + 1
            ) // add 1 to prevent divide by 0
          );
        }
        break;
    }
  }

  $: if ($cachedData) {
    markerSpecs = [];
    for (const featureSpec of $cachedData.featureSpecs) {
      markerSpecs.push({
        label: featureSpec.label,
        latitude: featureSpec.latitude,
        longitude: featureSpec.longitude,
        color: toColorByColorMeaning[colorMeaning](featureSpec)
      });
    }
  }

  function requestLoadData() {
    if ($cachedData) {
      const query = $cachedData.query;
      queryRequest = {
        fromDateMillis: query.fromDateMillis,
        throughDateMillis: query.throughDateMillis,
        filterTaxa: query.taxonFilter !== null,
        filterLocations: query.locationFilter !== null,
        onlyCaveObligates: query.onlyCaveObligates
      };
    } else {
      queryRequest = {
        fromDateMillis: EARLIEST_RECORD_DATE.getTime(),
        throughDateMillis: new Date().getTime(),
        filterTaxa: false,
        filterLocations: false,
        onlyCaveObligates: false
      };
    }
  }

  async function performQuery(request: MapQueryRequest) {
    queryRequest = null;

    const specedMapQuery: MapQuery = {
      fromDateMillis: request.fromDateMillis,
      throughDateMillis: request.throughDateMillis,
      locationFilter: request.filterLocations ? await getLocationFilter() : null,
      taxonFilter: request.filterTaxa ? await getTaxonFilter() : null,
      onlyCaveObligates: request.onlyCaveObligates
    };
    const generalQuery = convertMapQuery(specedMapQuery);

    // Generate the title.

    let locationFilterName = 'All locations';
    let dateQualifier = 'having';
    if (generalQuery.locationFilter) {
      locationFilterName = 'Selected locations';
      const locationSpecs = Object.values($selectedLocations!);
      if (locationSpecs.length == 1) {
        const locationSpec = locationSpecs[0];
        locationFilterName = locationSpec.name;
        if (locationSpec.rank == LocationRank.Locality) {
          const parentNames = locationSpec.parentNamePath.split('|');
          locationFilterName += ', ' + parentNames[parentNames.length - 1];
          dateQualifier = ' for';
        } else {
          locationFilterName += ' locations';
        }
      }
    }

    let taxonFilterName = specedMapQuery.onlyCaveObligates ? 'cave obligates' : '';
    if (generalQuery.taxonFilter) {
      taxonFilterName = 'selected taxa';
      const taxonSpecs = Object.values($selectedTaxa!);
      if (taxonSpecs.length == 1) {
        const taxonFilter = generalQuery.taxonFilter;
        taxonFilterName = taxonSpecs[0].unique;
        if (
          taxonFilter.subspeciesIDs ||
          taxonFilter.speciesIDs ||
          taxonFilter.genusIDs
        ) {
          taxonFilterName = `<i>${taxonFilterName}</i>`;
        }
      }
      if (specedMapQuery.onlyCaveObligates) {
        taxonFilterName += ' that are cave obligates';
      }
    }
    if (taxonFilterName != '') {
      taxonFilterName = ' containing ' + taxonFilterName;
    }

    const fromDate = new Date(generalQuery.dateFilter!.fromDateMillis!);
    const thruDate = new Date(generalQuery.dateFilter!.throughDateMillis!);
    let description =
      `${locationFilterName}${taxonFilterName} ` +
      `${dateQualifier} records dated ${fromDate.toLocaleDateString()} through ${thruDate.toLocaleDateString()}`;

    // Load the data

    loading = true;
    const featureSpecs: FeatureSpec[] = [];
    let nextFeatureSpec: FeatureSpec | null = null;
    let offset = 0;
    let done = false;
    while (!done) {
      const rows = await _loadBatch(generalQuery, offset);
      for (const row of rows) {
        let label = row.localityName!;
        if (row.countyName) label += ', ' + row.countyName;
        if (nextFeatureSpec && label != nextFeatureSpec.label) {
          let labelSuffix =
            nextFeatureSpec.recordCount == 1
              ? '1 record, '
              : nextFeatureSpec.recordCount + ' records, ';
          labelSuffix +=
            nextFeatureSpec.visitCount == 1
              ? '1 visit, '
              : nextFeatureSpec.visitCount + ' visits, ';
          labelSuffix +=
            'last on ' +
            fromDaysEpoch(nextFeatureSpec.lastDaysEpoch).toLocaleDateString();
          nextFeatureSpec.label += ` (${labelSuffix})`;
          featureSpecs.push(nextFeatureSpec);
          nextFeatureSpec = null;
        }
        if (nextFeatureSpec === null) {
          nextFeatureSpec = {
            label,
            latitude: row.latitude!,
            longitude: row.longitude!,
            recordCount: row.recordCount!,
            visitCount: 1,
            lastDaysEpoch: toDaysEpoch(new Date(row.collectionEndDate!))
          };
        } else {
          nextFeatureSpec.recordCount += row.recordCount!;
          ++nextFeatureSpec.visitCount;
          nextFeatureSpec.recordCount = toDaysEpoch(new Date(row.collectionEndDate!));
        }
      }
      offset += MAP_QUERY_BATCH_SIZE;
      done = rows.length == 0;
    }
    loading = false;

    // Cache the data.

    cachedData.set({
      version: CACHED_DATA_VERSION,
      description,
      query: specedMapQuery,
      featureSpecs
    });
  }

  function convertMapQuery(mapQuery: MapQuery): GeneralQuery {
    const columnSpecs: QueryColumnSpec[] = [];
    columnSpecs.push({
      columnID: QueryColumnID.RecordCount,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.County,
      ascending: true,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Locality,
      ascending: true,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.CollectionEndDate,
      ascending: true,
      optionText: 'Non-blank'
    });
    columnSpecs.push({
      columnID: QueryColumnID.Latitude,
      ascending: null,
      optionText: 'Non-blank'
    });
    columnSpecs.push({
      columnID: QueryColumnID.Longitude,
      ascending: null,
      optionText: 'Non-blank'
    });
    if (mapQuery.onlyCaveObligates) {
      columnSpecs.push({
        columnID: QueryColumnID.Obligate,
        ascending: null,
        optionText: 'Yes'
      });
    }

    return {
      columnSpecs,
      dateFilter: {
        fromDateMillis: mapQuery.fromDateMillis,
        throughDateMillis: mapQuery.throughDateMillis
      },
      locationFilter: mapQuery.locationFilter,
      taxonFilter: mapQuery.taxonFilter
    };
  }

  async function _loadBatch(query: GeneralQuery, offset: number): Promise<QueryRow[]> {
    try {
      let res = await $client.post('api/specimen/query', {
        query,
        skip: offset,
        limit: MAP_QUERY_BATCH_SIZE
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

  function _toScaleColor(numerator: number, denominator: number): string {
    let fraction = numerator / denominator;
    // if (colorMeaning == ColorMeaning.visits) {
    //   fraction = Math.log(numerator) / Math.log(denominator);
    // }
    const r = ZERO_COLOR[0] + fraction * (rightRGB[0] - ZERO_COLOR[0]);
    const g = ZERO_COLOR[1] + fraction * (rightRGB[1] - ZERO_COLOR[1]);
    const b = ZERO_COLOR[2] + fraction * (rightRGB[2] - ZERO_COLOR[2]);
    return `rgb(${r},${g},${b})`;
  }

  const clearSelections = () => (requestClearConfirmation = true);

  const confirmClear = () => {
    requestClearConfirmation = false;
    $cachedData = null;
  };

  const cancelClear = () => (requestClearConfirmation = false);

  const resized = () => {
    $cachedData = $cachedData; // force redraw
  };
</script>

<DataTabRoute activeTab={tabName}>
  <svelte:fragment slot="body">
    <div class="container-fluid mb-2">
      <TabHeader {tabName} title={$pageName} onResize={resized}>
        <span slot="instructions"
          >Use the <a href="/taxa">Taxa</a> and <a href="/locations">Locations</a> tabs to
          specify the optional filters to use when loading maps. Hover over a marker to see
          the features at that marker. Click a marker to pin or unpin these features.</span
        >
        <span slot="main-buttons">
          {#if $cachedData}
            <button class="btn btn-minor" type="button" on:click={clearSelections}
              >Clear</button
            >
          {/if}
          <button class="btn btn-major" type="button" on:click={requestLoadData}
            >{$cachedData ? 'Change Map' : 'Load Map'}</button
          >
        </span>
      </TabHeader>
    </div>

    {#if !$cachedData}
      <EmptyTab message="No map loaded" />
    {:else}
      <div class="container-fluid">
        <div class="row">
          <div class="col-auto">
            <div class="btn-group" role="group" aria-label="Switch datasets">
              <input
                type="radio"
                class="btn-check"
                bind:group={colorMeaning}
                name="color_meaning"
                id={ColorMeaning.records}
                value={ColorMeaning.records}
              />
              <label class="btn btn-outline-primary" for={ColorMeaning.records}
                >Records</label
              >
              <input
                type="radio"
                class="btn-check"
                bind:group={colorMeaning}
                name="color_meaning"
                id={ColorMeaning.visits}
                value={ColorMeaning.visits}
              />
              <label class="btn btn-outline-primary" for={ColorMeaning.visits}
                >Visits</label
              >
              <input
                type="radio"
                class="btn-check"
                bind:group={colorMeaning}
                name="color_meaning"
                id={ColorMeaning.lastVisit}
                value={ColorMeaning.lastVisit}
              />
              <label class="btn btn-outline-primary" for={ColorMeaning.lastVisit}
                >Last Visit</label
              >
            </div>
          </div>
          <div class="col d-flex align-items-center">
            <div class="color_scale">
              {#each scaleDivisions as scaleDivision, i}
                <div
                  style="width: calc({100 /
                    scaleDivisions.length}% - 1px); background-color: {scaleColors[i]}"
                  data-text={scaleDivision}
                />
              {/each}
            </div>
          </div>
        </div>
        <div class="row mt-3 mb-3 justify-content-center">
          <div class="col">
            <div class="description">{@html $cachedData.description}</div>
          </div>
        </div>
      </div>
      <div class="map_area">
        <KarstMap {markerSpecs} color="rgb({rightRGB.join(',')})" />
      </div>
    {/if}
  </svelte:fragment>
</DataTabRoute>

{#if loading}
  <BusyMessage message="Loading data..." />
{/if}

{#if queryRequest !== null}
  <MapFilterDialog
    initialQueryRequest={queryRequest}
    onSubmit={performQuery}
    onClose={() => (queryRequest = null)}
  />
{/if}

{#if requestClearConfirmation}
  <ConfirmationRequest
    alert="warning"
    message="Clear this map?"
    okayButton="Clear"
    onOkay={confirmClear}
    onCancel={cancelClear}
  />
{/if}

<style>
  .color_scale {
    width: 100%;
    height: 1.5rem;
  }
  .color_scale div {
    position: relative;
    display: inline-block;
    height: 100%;
    margin-left: 1px;
  }
  .color_scale div:before {
    content: attr(data-text);
    position: absolute;
    transform: translateX(-50%);
    left: 50%;
    bottom: 100%;
    width: 8rem;
    margin-bottom: 6px;
    text-align: center;
    display: none;
    font-size: 0.8rem;
  }
  .color_scale div:after {
    content: '';
    position: absolute;
    transform: translateX(-50%);
    left: 50%;
    bottom: 100%;
    margin-bottom: -4px;
    border: 6px solid #000;
    border-color: black transparent transparent transparent;
    display: none;
  }
  .color_scale div:hover:before,
  .color_scale div:hover:after {
    display: block;
    z-index: 100;
  }
  .map_area {
    display: flex;
    position: relative;
    flex-direction: column;
    flex-grow: 1;
  }
  .description {
    text-align: center;
    font-weight: bold;
    font-size: 1.1rem;
  }
</style>
