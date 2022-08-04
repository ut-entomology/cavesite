<script lang="ts" context="module">
  import MapFilterDialog, { type MapQueryRequest } from './MapFilterDialog.svelte';
  import Map, { MapMarkerSpec } from '../../components/Map.svelte';
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

  interface MapData {
    version: number;
    description: string;
    query: MapQuery;
    markerSpecs: MapMarkerSpec[];
  }

  const CACHED_DATA_VERSION = 1;
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
  import { showNotice } from '../../common/VariableNotice.svelte';

  $pageName = 'Map View';
  const tabName = 'Map';

  $: if ($cachedData && $cachedData.version != CACHED_DATA_VERSION) {
    $cachedData = null;
  }

  let loading = false;
  let queryRequest: MapQueryRequest | null = null;
  let requestClearConfirmation = false;

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
      `${locationFilterName}${taxonFilterName}<br/>` +
      `${dateQualifier} records dated ${fromDate.toLocaleDateString()} through ${thruDate.toLocaleDateString()}`;

    // Load the data

    loading = true;
    const markerSpecs: MapMarkerSpec[] = [];
    let offset = 0;
    let done = false;
    while (!done) {
      const rows = await _loadBatch(generalQuery, offset);
      for (const row of rows) {
        let label = row.localityName!;
        if (row.countyName) label += ', ' + row.countyName;
        markerSpecs.push({
          label,
          latitude: row.latitude!,
          longitude: row.longitude!,
          color: 'orange'
        });
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
      markerSpecs
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
      columnID: QueryColumnID.Locality,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.County,
      ascending: null,
      optionText: null
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
    <div class="container-fluid mb-3">
      <TabHeader {tabName} title={$pageName} onResize={resized}>
        <span slot="instructions"
          >Use the <a href="/taxa">Taxa</a> and <a href="/locations">Locations</a> tabs to
          specify the optional filters to use when loading maps.</span
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

      {#if !$cachedData}
        <EmptyTab message="No map loaded" />
      {:else}
        <div class="row mt-3 mb-3 justify-content-center description">
          <div class="col-10">{@html $cachedData.description}</div>
        </div>
        <div class="container-fluid gx-1">
          <Map markerSpecs={$cachedData.markerSpecs} />
        </div>
      {/if}
    </div>
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
  .description {
    text-align: center;
    font-weight: bold;
    font-size: 1.1rem;
  }
</style>
