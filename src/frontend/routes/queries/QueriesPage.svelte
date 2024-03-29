<script lang="ts" context="module">
  import { createSessionStore } from '../../util/session_store';
  import { GeneralQuery, QueryColumnID, QueryRow } from '../../../shared/general_query';

  const CACHED_VERSION = 2;

  // columnPxWidths is indexed by ColumnID
  const columnPxWidths = createSessionStore<Record<string, number>>(
    'column_widths',
    {}
  );
</script>

<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import page from 'page';

  import { appInfo } from '../../stores/app_info';
  import { pageName } from '../../stores/pageName';
  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import EmptyTab from '../../components/EmptyTab.svelte';
  import QueryFilterDialog from './QueryFilterDialog.svelte';
  import QueryDownloadDialog from './QueryDownloadDialog.svelte';
  import RowControls, {
    type RowControlsConfig
  } from '../../components/RowControls.svelte';
  import ColumnResizer from '../../components/ColumnResizer.svelte';
  import MoreLess from '../../components/MoreLess.svelte';
  import BusyMessage from '../../common/BusyMessage.svelte';
  import QueriesHowTo from './QueriesHowTo.svelte';
  import { showNotice } from '../../common/VariableNotice.svelte';
  import { columnInfoMap } from '../../../shared/general_query';
  import { client, errorReason } from '../../stores/client';
  import { type CachedResults, cachedResults } from '../../stores/cached_results';
  import { generateResultsMap } from '../../stores/generate_results_map';

  $pageName = 'Queries';
  const tabName = 'Queries';

  const QUERY_BUTTON_LABEL = 'New Query';
  const SMALL_STEP_ROWS = 20;
  const BIG_STEP_ROWS = 400;

  const rowControlsConfig: RowControlsConfig = {
    smallStepRows: SMALL_STEP_ROWS,
    bigStepRows: BIG_STEP_ROWS,
    toFirstSet,
    bigStepBack,
    smallStepBack,
    smallStepForward,
    bigStepForward,
    toLastSet
  };

  let templateQuery: GeneralQuery | null = null;
  let lastRowNumber = 0;
  let requestDownload = false;
  let downloadingData = false;

  // Drop prior representation of columns, in case users have this cached.
  if (Array.isArray($columnPxWidths)) $columnPxWidths = {};

  $: if ($cachedResults && $cachedResults.version != CACHED_VERSION) {
    $cachedResults = null;
  }

  $: if ($cachedResults) {
    lastRowNumber = $cachedResults.startOffset + BIG_STEP_ROWS;
    if (lastRowNumber > $cachedResults.totalRows) {
      lastRowNumber = $cachedResults.totalRows;
    }
  }
  let gridColumnWidths = '';
  let scrollArea: HTMLDivElement;
  let installedScrollListener = false;

  onMount(_initColumnWidths);

  afterUpdate(() => {
    if (scrollArea && !installedScrollListener) {
      const resultsHeader = document.getElementById('results_header');
      scrollArea.addEventListener('scroll', () => {
        resultsHeader!.style.marginLeft = `-${scrollArea.scrollLeft}px`;
      });
      installedScrollListener = true;
    }
  });

  function clearQuery() {
    $cachedResults = null;
  }

  function createNewQuery() {
    templateQuery = $cachedResults?.query || null;
    if (templateQuery === null) {
      templateQuery = {
        columnSpecs: [],
        dateFilter: null,
        locationFilter: null,
        taxonFilter: null
      };
      for (const columnID of $appInfo.defaultQueryFields) {
        const columnInfo = columnInfoMap[columnID];
        templateQuery.columnSpecs.push({
          columnID: columnInfo.columnID,
          ascending: null,
          optionText: columnInfo.options ? columnInfo.options[0].text : null
        });
      }
    }
  }

  async function performQuery(query: GeneralQuery) {
    templateQuery = null; // close the query dialog

    const results: CachedResults = {
      version: CACHED_VERSION,
      query,
      startOffset: 0,
      totalRows: 0,
      rows: []
    };
    cachedResults.set(results);
    results.rows = await _loadRows(0, BIG_STEP_ROWS);
    cachedResults.set(results);
    _initColumnWidths();
  }

  async function toFirstSet() {
    const results = $cachedResults!;
    if (results.startOffset > 0) {
      results.startOffset = 0;
      results.rows = await _loadRows(0, BIG_STEP_ROWS);
      cachedResults.set(results);
    }
  }

  async function bigStepBack() {
    const results = $cachedResults!;
    if (results.startOffset > 0) {
      results.startOffset -= BIG_STEP_ROWS;
      if (results.startOffset < 0) {
        results.startOffset = 0;
      }
      results.rows = await _loadRows(results.startOffset, BIG_STEP_ROWS);
      cachedResults.set(results);
      scrollArea.scrollTop = 0;
    }
  }

  async function smallStepBack() {
    const results = $cachedResults!;
    if (results.startOffset > 0) {
      const priorStartOffset = results.startOffset;
      results.startOffset -= SMALL_STEP_ROWS;
      if (results.startOffset < 0) {
        results.startOffset = 0;
      }
      const precedingRows = await _loadRows(
        results.startOffset,
        priorStartOffset - results.startOffset
      );
      precedingRows.forEach((_) => results.rows.pop());
      results.rows.unshift(...precedingRows);
      cachedResults.set(results);
      scrollArea.scrollTop = 0;
    }
  }

  async function smallStepForward() {
    const results = $cachedResults!;
    if (results.startOffset + results.rows.length < results.totalRows) {
      const followingRows = await _loadRows(
        results.startOffset + BIG_STEP_ROWS,
        SMALL_STEP_ROWS
      );
      results.startOffset += SMALL_STEP_ROWS;
      followingRows.forEach((_) => results.rows.shift());
      results.rows.push(...followingRows);
      cachedResults.set(results);
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }

  async function bigStepForward() {
    const results = $cachedResults!;
    if (results.startOffset + BIG_STEP_ROWS < results.totalRows) {
      results.startOffset += BIG_STEP_ROWS;
      results.rows = await _loadRows(results.startOffset, BIG_STEP_ROWS);
      cachedResults.set(results);
      scrollArea.scrollTop = 0;
    }
  }

  async function toLastSet() {
    const results = $cachedResults!;
    if (results.startOffset + results.rows.length < results.totalRows) {
      results.startOffset = results.totalRows - BIG_STEP_ROWS;
      results.rows = await _loadRows(results.startOffset, BIG_STEP_ROWS);
      cachedResults.set(results);
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }

  function generateMap() {
    $generateResultsMap = true;
    page('/map');
  }

  function _checkForMapResultButton(results: CachedResults): boolean {
    return !!results.query.columnSpecs.find(
      (spec) => spec.columnID == QueryColumnID.Locality
    );
  }

  async function _downloadData(filename: string) {
    requestDownload = false;
    downloadingData = true;

    filename = filename.trim();
    if (!filename.endsWith('.csv')) {
      if (filename.endsWith('.')) {
        filename += 'csv';
      } else {
        filename += '.csv';
      }
    }

    const columnSpecs = $cachedResults!.query.columnSpecs;
    const headers: string[] = [];
    for (const columnSpec of columnSpecs) {
      const columnInfo = columnInfoMap[columnSpec.columnID];
      headers.push(_escapeCsvColumn(columnInfo.fullName));
    }

    let csvLines: string[] = [headers.join(',')];
    let batchRows: QueryRow[];
    let offset = 0;
    do {
      batchRows = await _loadRows(offset, BIG_STEP_ROWS);
      for (const row of batchRows) {
        const columns: string[] = [];
        for (const columnSpec of columnSpecs) {
          const columnInfo = columnInfoMap[columnSpec.columnID];
          const columnValue = columnInfo.getValue(row).toString();
          columns.push(_escapeCsvColumn(columnValue));
        }
        csvLines.push(columns.join(','));
      }
      offset += BIG_STEP_ROWS;
    } while (batchRows.length > 0);
    const text = csvLines.join('\n');
    const file = new Blob([text], { type: 'text/plain' });

    // from https://stackoverflow.com/a/30832210/650894
    const a = document.createElement('a');
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);

    downloadingData = false;
  }

  function _escapeCsvColumn(column: string): string {
    // Excel compatible
    if (column == '') return '';
    column = column.replace('<i>', '').replace('</i>', '');
    const escaped = column.replaceAll('"', '""');
    const hasSpecialChar = column.includes(',') || column.includes("'");
    return escaped != column || hasSpecialChar ? `"${escaped}"` : column;
  }

  function _initColumnWidths() {
    if (Object.values($columnPxWidths).length == 0) {
      const emInPx = _getEmInPx();
      for (const columnInfo of Object.values(columnInfoMap)) {
        $columnPxWidths[columnInfo.columnID] = columnInfo.defaultEmWidth * emInPx;
      }
    }
    if ($cachedResults) _renderColumnWidths();
  }

  async function _loadRows(offset: number, count: number): Promise<QueryRow[]> {
    const results = $cachedResults!;
    try {
      let res = await $client.post('api/specimen/query', {
        query: results.query,
        skip: offset,
        limit: count
      });
      // Only set totalRows, as caller may not reassign all cached rows. totalRows
      // is null except when retrieving from offset 0.
      if (res.data.totalRows !== null) {
        results.totalRows = res.data.totalRows;
      }
      return res.data.rows;
    } catch (err: any) {
      showNotice({
        message: `Failed to load rows<br/><br/>` + errorReason(err.response),
        header: 'Error',
        alert: 'danger'
      });
      results.totalRows = 0;
      return [];
    }
  }

  function _resizeColumn(columnID: QueryColumnID, widthPx: number) {
    $columnPxWidths[columnID] = widthPx;
    _renderColumnWidths();
    const columnSpecs = $cachedResults!.query.columnSpecs;
    if (columnID == columnSpecs[columnSpecs.length - 1].columnID) {
      const scrollArea = document.getElementById('scroll_area');
      scrollArea!.scrollLeft = scrollArea!.offsetWidth;
    }
  }

  function _renderColumnWidths() {
    const results = $cachedResults!;
    const pxWidths: string[] = [];
    for (const columnSpec of results.query.columnSpecs) {
      const pxWidth = $columnPxWidths[columnSpec.columnID] + 'px';
      pxWidths.push(`minmax(${pxWidth},${pxWidth})`);
    }
    gridColumnWidths = pxWidths.join(' ');
  }

  function _getEmInPx(): number {
    // from https://stackoverflow.com/a/39307160/650894
    const elem = document.getElementById('em_sample');
    elem!.style.width = '1em';
    return elem!.offsetWidth;
  }
</script>

<DataTabRoute activeTab={tabName} embedHowTo={!$cachedResults}>
  <svelte:fragment slot="how-to"><QueriesHowTo /></svelte:fragment>
  <svelte:fragment slot="body">
    <div id="em_sample" />
    <div class="container-fluid">
      <TabHeader {tabName} title={$pageName} center={false} onResize={() => {}}>
        <span slot="instructions"
          >Query the data according to your custom criteria. Use the <a href="/taxa"
            >Taxa</a
          >
          and <a href="/locations">Locations</a> tabs to specify the optional query
          filters.
          <MoreLess
            >Queries always return distinct rows, returning one row per specimen record
            only when you include the Catalog Number in the query. Include the Record
            Count field to see the number of records associated with each distinct row.
            For example, to see the number of specimen records there are for each
            location, query for just the Record Count, Locality, and County fields (some
            localities have identical names in different counties).</MoreLess
          ></span
        >
        <span slot="main-buttons">
          {#if $cachedResults}
            {#if _checkForMapResultButton($cachedResults)}
              <button class="btn btn-major" type="button" on:click={generateMap}
                >Map Results</button
              >
            {/if}
            <button class="btn btn-minor" type="button" on:click={clearQuery}
              >Clear</button
            >
            <button
              class="btn btn-minor download_icon ps-2 pe-2"
              type="button"
              on:click={() => (requestDownload = true)}
              ><img
                src="/static/download-icon.png"
                title="Download data"
                alt="Download data"
              /></button
            >
          {/if}
          <button class="btn btn-major" type="button" on:click={createNewQuery}
            >{QUERY_BUTTON_LABEL}</button
          >
        </span>
        <span slot="work-buttons">
          {#if $cachedResults}
            <RowControls
              firstRowNumber={$cachedResults.startOffset + 1}
              {lastRowNumber}
              totalRows={$cachedResults.totalRows}
              config={rowControlsConfig}
            />
          {/if}
        </span>
        <div slot="how-to"><QueriesHowTo /></div>
      </TabHeader>
    </div>

    {#if !$cachedResults}
      <EmptyTab message={'Click the "New Query" button to perform a query.'} />
    {:else}
      <div class="header_box">
        <div id="results_header" style="grid-template-columns: {gridColumnWidths}">
          {#each $cachedResults.query.columnSpecs as columnSpec}
            {@const columnID = columnSpec.columnID}
            {@const columnInfo = columnInfoMap[columnID]}
            <div class="header" title={columnInfo.description}>
              {columnInfo.abbrName || columnInfo.fullName}
              <ColumnResizer
                class="column_resizer"
                minWidthPx={20}
                onResize={(px) => _resizeColumn(columnID, px)}
              />
            </div>
          {/each}
        </div>
      </div>
      <div class="grid_box">
        <div id="scroll_area" bind:this={scrollArea}>
          {#if $cachedResults.totalRows > 0}
            <div id="results_grid" style="grid-template-columns: {gridColumnWidths}">
              {#each $cachedResults.rows as row, i}
                {#each $cachedResults.query.columnSpecs as columnSpec, j}
                  {@const columnInfo = columnInfoMap[columnSpec.columnID]}
                  <div
                    class={columnInfo.columnClass || ''}
                    class:even={i % 2 == 0}
                    class:left={j == 0}
                  >
                    {@html columnInfo.getValue(row)}
                  </div>
                {/each}
              {/each}
            </div>
          {:else}
            <div class="no_results">No results found.</div>
          {/if}
        </div>
      </div>
    {/if}
  </svelte:fragment>
</DataTabRoute>

{#if templateQuery !== null}
  <QueryFilterDialog
    initialQuery={templateQuery}
    onQuery={performQuery}
    onClose={() => (templateQuery = null)}
  />
{/if}

{#if requestDownload && $cachedResults}
  <QueryDownloadDialog
    rowCount={$cachedResults.totalRows}
    submit={_downloadData}
    close={() => (requestDownload = false)}
  />
{/if}

{#if downloadingData}
  <BusyMessage message="Downloading data..." />
{/if}

<style lang="scss">
  .header_box {
    margin-top: 0.5rem;
    overflow: hidden;
    font-size: 0.9rem;
    cursor: default;
  }
  .grid_box {
    flex-grow: 1;
    overflow: hidden;
    position: relative;
    font-size: 0.9rem;
  }

  #scroll_area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: scroll;
  }

  #em_sample {
    height: 0;
    width: 0;
    outline: none;
    border: none;
    padding: none;
    margin: none;
    box-sizing: content-box;
  }

  #results_header {
    border-bottom: 1px solid #888;
    overflow: hidden;
  }

  #results_grid,
  #results_header {
    display: grid;
    grid-auto-rows: 1.9rem;
    grid-gap: 0px;
  }

  #results_header div,
  #results_grid div {
    white-space: nowrap;
    padding: 0.2rem 0.4rem;
    overflow: hidden;
  }

  #results_header div {
    font-weight: bold;
    position: relative;
  }

  #results_grid div {
    border-right: 1px solid #888;
    border-bottom: 1px solid #888;
  }

  #results_grid div.even {
    background-color: #ececec;
  }

  #results_grid div.left {
    border-left: 1px solid #888;
  }

  #results_grid .center {
    text-align: center;
  }

  :global(.column_resizer) {
    position: absolute;
    top: 0.1rem;
    right: 0;
    z-index: 10;
  }

  :global(.column_resizer img) {
    opacity: 0.75;
    height: 0.8em;
  }

  .no_results {
    margin: 3rem 0;
    text-align: center;
    font-size: 1.1rem;
  }

  .download_icon img {
    margin-top: -0.2rem;
    width: 1.2rem;
    height: 1.2rem;
  }
</style>
