<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';
  import { GeneralQuery, QueryColumnID, QueryRow } from '../../shared/general_query';

  interface CachedResults {
    query: GeneralQuery;
    startOffset: number;
    totalRows: number;
    rows: QueryRow[];
  }

  const cachedResults = createSessionStore<CachedResults | null>(
    'cached_results',
    null
  );
  // columnPxWidths is indexed by ColumnID
  const columnPxWidths = createSessionStore<number[]>('column_widths', []);
</script>

<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { pageName } from '../stores/pageName';

  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import QueryFilterDialog from '../dialogs/QueryFilterDialog.svelte';
  import RowControls, {
    type RowControlsConfig
  } from '../components/RowControls.svelte';
  import ColumnResizer from '../components/ColumnResizer.svelte';
  import { showNotice } from '../common/VariableNotice.svelte';
  import { columnInfoMap } from '../../shared/general_query';
  import { client, errorReason } from '../stores/client';

  $pageName = 'Query Results';

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
      for (let i = 0; i < QueryColumnID._LENGTH; ++i) {
        const columnInfo = columnInfoMap[i];
        if (columnInfo.defaultSelection) {
          templateQuery.columnSpecs.push({
            columnID: columnInfo.columnID,
            ascending: null,
            optionText: columnInfo.options ? columnInfo.options[0].text : null
          });
        }
      }
    }
  }

  async function performQuery(query: GeneralQuery) {
    templateQuery = null; // close the query dialog

    const results: CachedResults = {
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
      results.rows = await _loadRows(0, BIG_STEP_ROWS);
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

  function _initColumnWidths() {
    if ($columnPxWidths.length == 0) {
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

<DataTabRoute activeTab="Query">
  <div id="em_sample" />
  <div class="container-fluid">
    <TabHeader
      title={$pageName}
      center={false}
      expandable={true}
      instructions="Specify the optional filters for new queries using the <a href='/taxa'>Taxa</a> and <a href='/locations'>Locations</a> tabs."
    >
      <span slot="main-buttons">
        <button class="btn btn-minor" type="button" on:click={clearQuery}>Clear</button>
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
</DataTabRoute>

{#if templateQuery !== null}
  <QueryFilterDialog
    initialQuery={templateQuery}
    onQuery={performQuery}
    onClose={() => (templateQuery = null)}
  />
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
</style>
