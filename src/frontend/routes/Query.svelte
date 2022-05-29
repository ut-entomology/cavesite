<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';
  import type { QueryColumnSpec, QueryRecord } from '../../shared/user_query';

  interface CachedQuery {
    columnSpecs: QueryColumnSpec[];
    startOffset: number;
    totalRows: number;
    records: QueryRecord[];
  }

  const cachedQuery = createSessionStore<CachedQuery | null>('cached_query', null);
</script>

<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import TabHeader from '../components/TabHeader.svelte';
  import EmptyTab from '../components/EmptyTab.svelte';
  import { columnInfoMap } from '../lib/query_column_info';

  const QUERY_BUTTON_LABEL = 'New Query';
  const SMALL_STEP_ROWS = 20;
  const BIG_STEP_ROWS = 500;

  let lastRowNumber = 0;
  $: if ($cachedQuery) {
    lastRowNumber = $cachedQuery.startOffset + BIG_STEP_ROWS;
    if (lastRowNumber > $cachedQuery.totalRows) {
      lastRowNumber = $cachedQuery.totalRows;
    }
  }

  function createNewQuery() {
    //
  }
</script>

<DataTabRoute activeTab="Query">
  <div class="container-fluid">
    <TabHeader title="Collection Effort" instructions="Instructions TBD">
      <span slot="main-buttons">
        <button class="btn btn-minor" type="button" on:click={createNewQuery}
          >{QUERY_BUTTON_LABEL}</button
        >
      </span>
      <span slot="work-buttons">
        {#if $cachedQuery}
          <div class="row_info">
            Rows {$cachedQuery.startOffset + 1} - {lastRowNumber} (of {$cachedQuery.totalRows})
          </div>
          <button class="btn btn-minor" type="button" on:click={toFirstSet}
            >&VerticalSeperator;&ltrif; Start</button
          >
          <button class="btn btn-minor" type="button" on:click={bigStepBack}
            >&ltrif;&ltrif; -{BIG_STEP_ROWS}</button
          >
          <button class="btn btn-minor" type="button" on:click={smallStepBack}
            >&ltrif; -{SMALL_STEP_ROWS}</button
          >
          <button class="btn btn-minor" type="button" on:click={smallStepForward}
            >+{SMALL_STEP_ROWS} &rtrif;</button
          >
          <button class="btn btn-minor" type="button" on:click={bigStepForward}
            >+{BIG_STEP_ROWS} &rtrif;&rtrif;</button
          >
          <button class="btn btn-minor" type="button" on:click={toLastSet}
            >End &rtrif;&VerticalSeperator;</button
          >
        {/if}
      </span>
    </TabHeader>
    {#if !$cachedQuery}
      <EmptyTab message="Please click [{QUERY_BUTTON_LABEL}] to perform a query." />
    {/if}
  </div>
</DataTabRoute>
