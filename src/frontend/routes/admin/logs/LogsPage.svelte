<script lang="ts">
  import AdminTabRoute from '../../../components/AdminTabRoute.svelte';
  import TabHeader from '../../../components/TabHeader.svelte';
  import EmptyTab from '../../../components/EmptyTab.svelte';
  import RowControls, {
    type RowControlsConfig
  } from '../../../components/RowControls.svelte';
  import DeleteLogsDialog from './DeleteLogsDialog.svelte';
  import { LogType, LogLevel, type Log } from '../../../../shared/model';
  import { flashMessage } from '../../../common/VariableFlash.svelte';
  import { showNotice } from '../../../common/VariableNotice.svelte';
  import { pageName } from '../../../stores/pageName';
  import { client, errorReason } from '../../../stores/client';
  import { MILLIS_PER_DAY } from '../../../../shared/date_tools';

  $pageName = 'Website Logs';
  const tabName = 'Logs';

  const SMALL_STEP_ROWS = 20;
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

  let startOffset: number;
  let totalRows: number;
  let logs: Log[];
  let lastRowNumber = 0;
  let requestDeletion = false;

  $: if (logs && logs.length > 0) {
    lastRowNumber = startOffset + BIG_STEP_ROWS;
    if (lastRowNumber > totalRows) {
      lastRowNumber = totalRows;
    }
  }
  let scrollArea: HTMLDivElement;

  async function prepareLogs() {
    let res = await $client.post('api/logs/pull_total');
    totalRows = res.data.totalLogs;
    startOffset = totalRows - BIG_STEP_ROWS;
    if (startOffset < 0) startOffset = 0;
    logs = await _loadLogs(startOffset, BIG_STEP_ROWS);
  }

  async function toFirstSet() {
    if (startOffset > 0) {
      startOffset = 0;
      logs = await _loadLogs(0, BIG_STEP_ROWS);
    }
  }

  async function bigStepBack() {
    if (startOffset > 0) {
      startOffset -= BIG_STEP_ROWS;
      if (startOffset < 0) {
        startOffset = 0;
      }
      logs = await _loadLogs(startOffset, BIG_STEP_ROWS);
      scrollArea.scrollTop = 0;
    }
  }

  async function smallStepBack() {
    if (startOffset > 0) {
      const priorStartOffset = startOffset;
      startOffset -= SMALL_STEP_ROWS;
      if (startOffset < 0) {
        startOffset = 0;
      }
      const precedingLogs = await _loadLogs(
        startOffset,
        priorStartOffset - startOffset
      );
      precedingLogs.forEach((_) => logs.pop());
      logs.unshift(...precedingLogs);
      logs = logs; // rerender
      scrollArea.scrollTop = 0;
    }
  }

  async function smallStepForward() {
    if (startOffset + logs.length < totalRows) {
      const followingLogs = await _loadLogs(
        startOffset + BIG_STEP_ROWS,
        SMALL_STEP_ROWS
      );
      startOffset += SMALL_STEP_ROWS;
      followingLogs.forEach((_) => logs.shift());
      logs.push(...followingLogs);
      logs = logs; // rerender
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }

  async function bigStepForward() {
    if (startOffset + BIG_STEP_ROWS < totalRows) {
      startOffset += BIG_STEP_ROWS;
      logs = await _loadLogs(startOffset, BIG_STEP_ROWS);
      scrollArea.scrollTop = 0;
    }
  }

  async function toLastSet() {
    if (startOffset + logs.length < totalRows) {
      startOffset = totalRows - BIG_STEP_ROWS;
      logs = await _loadLogs(startOffset, BIG_STEP_ROWS);
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }

  async function _loadLogs(skip: number, limit: number): Promise<Log[]> {
    try {
      let res = await $client.post('api/logs/pull_logs', { skip, limit });
      totalRows = res.data.totalLogs;
      return res.data.logs;
    } catch (err: any) {
      showNotice({
        message: `Failed to load logs<br/><br/>` + errorReason(err.response),
        header: 'Error',
        alert: 'danger'
      });
      totalRows = 0;
      return [];
    }
  }

  async function _performDeletion(throughDate: Date) {
    requestDeletion = false;
    await $client.post('api/logs/delete', {
      throughUnixTime: throughDate.getTime() + MILLIS_PER_DAY - 1
    });
    flashMessage('Deleted requested logs');
    await prepareLogs();
  }

  function _getFirstTerm(logType: LogType): string {
    const spaceOffset = logType.indexOf(' ');
    return spaceOffset < 0 ? logType : logType.substring(0, spaceOffset);
  }

  function _getTagHtml(log: Log): string {
    const tag = log.tag ? `<b>${log.tag}</b>` : '';
    switch (log.type) {
      case LogType.ImportRecord:
        if (log.tag == 'NO CATALOG NUMBER') return tag;
        return log.tag ? '# ' + tag : '';
      case LogType.UserLogin:
        return 'email: ' + tag;
    }
    return '';
  }
</script>

<AdminTabRoute activeTab={tabName}>
  {#await prepareLogs() then}
    <div class="container-fluid">
      <TabHeader {tabName} title={$pageName} center={false} onResize={() => {}}>
        <span slot="instructions"
          >This tab provides a log of events that are specific to this application. The
          web server maintains a separate log of all visits to the website. When you
          delete logs, you delete them up through a specified date.</span
        >
        <span slot="main-buttons">
          {#if logs && logs.length > 0}
            <button
              class="btn btn-minor"
              type="button"
              on:click={() => (requestDeletion = true)}>Delete Logs</button
            >
          {/if}
        </span>
        <span slot="work-buttons">
          {#if logs && logs.length > 0}
            <RowControls
              firstRowNumber={startOffset + 1}
              {lastRowNumber}
              {totalRows}
              config={rowControlsConfig}
            />
          {/if}
        </span>
      </TabHeader>
    </div>

    {#if !logs || logs.length == 0}
      <EmptyTab message={'There are no server logs to show.'} />
    {:else}
      <div class="log_box">
        <div id="scroll_area" bind:this={scrollArea}>
          <div id="log_list">
            {#each logs as log, i}
              <div class="row ps-2 pe-2 pt-1 pb-1" class:even={i % 2 == 0}>
                <div class="col">
                  <div class="row log_info">
                    <div class="col-sm-4 log_time">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div class="col-sm-3 log_type type_{_getFirstTerm(log.type)}">
                      {log.type}{#if log.level != LogLevel.Normal}
                        <span class="log_{log.level}">&nbsp;{log.level}</span>{/if}
                    </div>
                    <div class="col-sm-5">{@html _getTagHtml(log)}</div>
                  </div>
                  <div class="row ps-2 log_line">
                    <div class="col">{log.line}</div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  {/await}
</AdminTabRoute>

{#if requestDeletion}
  <DeleteLogsDialog submit={_performDeletion} close={() => (requestDeletion = false)} />
{/if}

<style lang="scss">
  .log_box {
    flex-grow: 1;
    overflow: auto;
    position: relative;
    font-size: 0.9rem;
    border-top: 1px solid #ddd;
  }

  #scroll_area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  #log_list div.even {
    background-color: #ececec;
  }

  .log_time {
    font-family: 'Courier New', Courier, monospace;
    font-weight: bold;
  }

  .log_type {
    font-weight: bold;
    text-transform: uppercase;
  }
  .log_warning {
    color: orange;
  }
  .log_error {
    color: red;
  }
  .log_type.type_import {
    color: green;
  }
  .log_type.type_user {
    color: purple;
  }
  .log_type.type_server {
    color: rgb(53, 180, 202);
  }

  .log_line {
    color: #777;
  }
</style>
