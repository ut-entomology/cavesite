<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';
  import { GeneralQuery, QueryColumnID, QueryRow } from '../../shared/user_query';

  interface CachedResults {
    query: GeneralQuery;
    startOffset: number;
    totalRows: number;
    rows: QueryRow[];
    columnEmWidths: number[]; // indexed by ColumnID
  }

  const cachedResults = createSessionStore<CachedResults | null>(
    'cached_results',
    null
  );
</script>

<script lang="ts">
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
  const SMALL_STEP_ROWS = 20;
  const BIG_STEP_ROWS = 500;

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

    let columnEmWidths = $cachedResults?.columnEmWidths || null;
    if (columnEmWidths == null) {
      columnEmWidths = [];
      for (const columnInfo of Object.values(columnInfoMap)) {
        columnEmWidths[columnInfo.columnID] = columnInfo.defaultEmWidth;
      }
    }
    const results: CachedResults = {
      query,
      startOffset: 0,
      totalRows: 0,
      rows: [],
      columnEmWidths
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
</script>

<DataTabRoute activeTab="Query">
  <div class="container-fluid">
    <TabHeader title="Query" instructions="Instructions TBD">
      <span slot="main-buttons">
        <button class="btn btn-minor" type="button" on:click={createNewQuery}
          >{QUERY_BUTTON_LABEL}</button
        >
      </span>
    </TabHeader>
    {#if !$cachedResults}
      <EmptyTab message="Please click [{QUERY_BUTTON_LABEL}] to perform a results." />
    {:else}
      <RowControls
        firstRowNumber={$cachedResults.startOffset + 1}
        {lastRowNumber}
        totalRows={$cachedResults.totalRows}
        config={rowControlsConfig}
      />
      <table>
        <thead>
          <tr>
            {#each $cachedResults.query.columnSpecs as columnSpec}
              {@const columnID = columnSpec.columnID}
              {@const columnInfo = columnInfoMap[columnID]}
              <th
                title={columnInfo.description}
                style="width: {$cachedResults.columnEmWidths[columnID]}em"
                >{columnInfo.abbrName || columnInfo.fullName}</th
              >
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each $cachedResults.rows as row}
            <tr>
              {#each $cachedResults.query.columnSpecs as columnSpec}
                {@const columnInfo = columnInfoMap[columnSpec.columnID]}
                <td>{columnInfo.getValue(row)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
      <RowControls
        firstRowNumber={$cachedResults.startOffset + 1}
        {lastRowNumber}
        totalRows={$cachedResults.totalRows}
        config={rowControlsConfig}
      />
    {/if}
  </div>
</DataTabRoute>

{#if templateQuery !== null}
  <QueryFilterDialog
    initialQuery={templateQuery}
    onQuery={performQuery}
    onClose={() => (templateQuery = null)}
  />
{/if}
