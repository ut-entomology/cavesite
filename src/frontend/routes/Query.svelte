<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';
  import { GeneralQuery, QueryColumnID, QueryRow } from '../../shared/user_query';

  interface CachedResults {
    query: GeneralQuery;
    startOffset: number;
    totalRows: number;
    rows: QueryRow[];
    columnPxWidths: number[]; // indexed by ColumnID
  }

  const cachedResults = createSessionStore<CachedResults | null>(
    'cached_results',
    null
  );
</script>

<script lang="ts">
  import { onMount } from 'svelte';

  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import QueryFilterDialog from '../dialogs/QueryFilterDialog.svelte';
  import RowControls, {
    type RowControlsConfig
  } from '../components/RowControls.svelte';
  import { showNotice } from '../common/VariableNotice.svelte';
  import { columnInfoMap } from '../lib/query_column_info';
  import { client, errorReason } from '../stores/client';

  const QUERY_BUTTON_LABEL = 'New Query';
  const SMALL_STEP_ROWS = 10;
  const BIG_STEP_ROWS = 100;

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

  onMount(() => {
    if ($cachedResults) {
      const pxWidths: string[] = [];
      for (const columnSpec of $cachedResults.query.columnSpecs) {
        const pxWidth = $cachedResults.columnPxWidths[columnSpec.columnID] + 'px';
        pxWidths.push(`minmax(${pxWidth},${pxWidth})`);
      }
      document.getElementById('results_grid')!.style.gridTemplateColumns =
        pxWidths.join(' ');
    }
  });

  function createNewQuery() {
    templateQuery = $cachedResults?.query || null;
    if (templateQuery === null) {
      templateQuery = {
        columnSpecs: [],
        taxonFilter: null
      };
      for (let i = 0; i < QueryColumnID._LENGTH; ++i) {
        const columnInfo = columnInfoMap[i];
        if (columnInfo.defaultSelection) {
          templateQuery.columnSpecs.push({
            columnID: columnInfo.columnID,
            ascending: null,
            nullValues: null
          });
        }
      }
    }
  }

  async function performQuery(query: GeneralQuery) {
    templateQuery = null; // close the query dialog

    let columnPxWidths = $cachedResults?.columnPxWidths || null;
    if (columnPxWidths == null) {
      const emInPx = getEmInPx();
      columnPxWidths = [];
      for (const columnInfo of Object.values(columnInfoMap)) {
        columnPxWidths[columnInfo.columnID] = columnInfo.defaultEmWidth * emInPx;
      }
    }
    const results: CachedResults = {
      query,
      startOffset: 0,
      totalRows: 0,
      rows: [],
      columnPxWidths
    };
    cachedResults.set(results);
    results.rows = await _loadRows(0, BIG_STEP_ROWS);
    cachedResults.set(results);
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
    }
  }

  async function bigStepForward() {
    const results = $cachedResults!;
    if (results.startOffset + BIG_STEP_ROWS < results.totalRows) {
      results.startOffset += BIG_STEP_ROWS;
      results.rows = await _loadRows(results.startOffset, BIG_STEP_ROWS);
      cachedResults.set(results);
    }
  }

  async function toLastSet() {
    const results = $cachedResults!;
    if (results.startOffset + results.rows.length < results.totalRows) {
      results.startOffset = results.totalRows - BIG_STEP_ROWS;
      results.rows = await _loadRows(results.startOffset, BIG_STEP_ROWS);
      cachedResults.set(results);
    }
  }

  async function _loadRows(offset: number, count: number): Promise<QueryRow[]> {
    const results = $cachedResults!;
    try {
      let res = await $client.post('api/specimen/query', {
        query: results.query,
        skip: offset,
        limit: count
      });
      // Only set totalRows, as caller may not reassign all cached rows.
      results.totalRows = res.data.totalRows;
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

  // function _updateColumnWidth() {
  //   //
  // }

  function getEmInPx(): number {
    // from https://stackoverflow.com/a/39307160/650894
    const elem = document.getElementById('em_sample');
    elem!.style.width = '1em';
    return elem!.offsetWidth;
  }
</script>

<DataTabRoute activeTab="Query">
  <div class="container-fluid">
    <TabHeader title="Query" instructions="Instructions TBD">
      <span slot="main-buttons">
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
    <EmptyTab message="Please click [{QUERY_BUTTON_LABEL}] to perform a results." />
  {:else}
    <div class="rows_box">
      <div class="rows">
        <div id="em_sample" />
        <div id="results_grid">
          {#each $cachedResults.query.columnSpecs as columnSpec}
            {@const columnID = columnSpec.columnID}
            {@const columnInfo = columnInfoMap[columnID]}
            <div class="header" title={columnInfo.description}>
              {columnInfo.abbrName || columnInfo.fullName}
            </div>
          {/each}
          {#each $cachedResults.rows as row, i}
            {#each $cachedResults.query.columnSpecs as columnSpec, j}
              {@const columnInfo = columnInfoMap[columnSpec.columnID]}
              <div class:even={i % 2 == 0} class:left={j == 0}>
                {columnInfo.getValue(row)}
              </div>
            {/each}
          {/each}
        </div>
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
  .rows_box {
    margin-top: 0.5rem;
    flex-grow: 1;
    overflow: hidden;
    position: relative;
    font-size: 0.9rem;
  }

  .rows_box .rows {
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

  #results_grid {
    display: grid;
    grid-auto-rows: 1.9rem;
    grid-gap: 0px;
  }

  #results_grid div {
    border-right: 1px solid #888;
    border-bottom: 1px solid #888;
    white-space: nowrap;
    padding: 0.2rem 0.4rem;
    overflow: hidden;
  }

  #results_grid div.even {
    background-color: #ececec;
  }

  #results_grid div.left {
    border-left: 1px solid #888;
  }

  #results_grid div.header {
    font-weight: bold;
    border-left: none;
    border-right: none;
  }
</style>
