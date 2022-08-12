<script lang="ts">
  import AdminTabRoute from '../../../components/AdminTabRoute.svelte';
  import TabHeader from '../../../components/TabHeader.svelte';
  import { pageName } from '../../../stores/pageName';
  import {
    IMPORT_SCHEDULE_KEY,
    type ImportSchedule
  } from '../../../../shared/data_keys';
  import { client } from '../../../stores/client';
  import { empty } from 'svelte/internal';

  const tabName = 'Schedule';
  $pageName = 'GBIF Import Schedule';

  let schedule: ImportSchedule | null;
  let requestChangeSchedule = false;

  async function _loadSchedule() {
    schedule = await $client.post('api/key_data/pull_data', {
      mine: false,
      key: IMPORT_SCHEDULE_KEY
    });
  }

  async function submitSchedule(schedule: ImportSchedule | null) {
    await $client.post('api/key_data/set_schedule', { schedule });
  }
</script>

<AdminTabRoute activeTab="Schedule">
  {#await _loadSchedule() then}
    <div class="container-fluid">
      <TabHeader {tabName} title={$pageName}>
        <span slot="main-buttons">
          <button class="btn btn-major" on:click={() => (requestChangeSchedule = true)}
            >Change</button
          >
        </span>
      </TabHeader>
    </div>
    {#if !schedule}
      empty
    {:else}
      <div class="row">
        <div class="col text-end">Importing on</div>
        <div class="col">days</div>
      </div>
      <div class="row">
        <div class="col text-end">at</div>
        <div class="col">hour</div>
      </div>
    {/if}
  {/await}
</AdminTabRoute>

<!-- 
{#if requestChangeSchedule}
  <ImportScheduleDialog
    {schedule}
    submit={submitSchedule}
    close={() => (requestChangeSchedule = false)}
  />
{/if} -->
