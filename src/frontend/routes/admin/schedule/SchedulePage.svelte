<script lang="ts">
  import AdminTabRoute from '../../../components/AdminTabRoute.svelte';
  import TabHeader from '../../../components/TabHeader.svelte';
  import EmptyTab from '../../../components/EmptyTab.svelte';
  import ConfirmationRequest from '../../../common/ConfirmationRequest.svelte';
  import ScheduleDialog, { toHourString } from './ScheduleDialog.svelte';
  import { pageName } from '../../../stores/pageName';
  import {
    IMPORT_SCHEDULE_KEY,
    daysOfWeek,
    type ImportSchedule
  } from '../../../../shared/data_keys';
  import { loadKeyData } from '../../../lib/key_data_client';
  import { client } from '../../../stores/client';

  const tabName = 'Schedule';
  $pageName = 'GBIF Import Schedule';

  let schedule: ImportSchedule | null;
  let requestChangeSchedule = false;
  let requestDisableConfirmation = false;

  async function confirmDisable() {
    requestDisableConfirmation = false;
    await $client.post('api/key_data/set_schedule', { schedule: null });
    schedule = null;
  }

  async function _loadSchedule() {
    schedule = JSON.parse(await loadKeyData($client, false, IMPORT_SCHEDULE_KEY));
  }

  async function submitSchedule(newSchedule: ImportSchedule | null) {
    requestChangeSchedule = false;
    await $client.post('api/key_data/set_schedule', { schedule: newSchedule });
    schedule = newSchedule;
  }
</script>

<AdminTabRoute activeTab="Schedule">
  {#await _loadSchedule() then}
    <div class="container-fluid">
      <TabHeader {tabName} title={$pageName}>
        <span slot="instructions">
          This tab shows the days on which records will be imported from GBIF and the
          hour of each day during which import will occur. Each import entirely replaces
          all of the records with those found in GBIF, allowing records to be added,
          removed, and changed. Only Texas records with accession number '002022c' are
          imported. GBIF reports this accession number as collection code
          'Biospeleology'.
        </span>
        <span slot="main-buttons">
          {#if schedule}
            <button
              class="btn btn-minor"
              on:click={() => (requestDisableConfirmation = true)}>Disable</button
            >
          {/if}
          <button class="btn btn-major" on:click={() => (requestChangeSchedule = true)}
            >{schedule ? 'Change' : 'Set Schedule'}</button
          >
        </span>
      </TabHeader>
    </div>
    {#if !schedule}
      <EmptyTab message="Importing is disabled" />
    {:else}
      <div class="row mt-3">
        <div class="col text-center">
          Importing every {@html schedule.importDaysOfWeek
            .map((day) => `<b>${daysOfWeek[day]}</b>`)
            .join(', ')}
        </div>
      </div>
      <div class="row mt-2 mb-3">
        <div class="col text-center">
          during hour <b>{toHourString(schedule.importHourOfDay)}</b>
        </div>
      </div>
    {/if}
  {/await}
</AdminTabRoute>

{#if requestChangeSchedule}
  {@const initialSchedule = schedule
    ? schedule
    : {
        importHourOfDay: 4,
        importDaysOfWeek: [0]
      }}
  <ScheduleDialog
    {initialSchedule}
    submit={submitSchedule}
    close={() => (requestChangeSchedule = false)}
  />
{/if}

{#if requestDisableConfirmation}
  <ConfirmationRequest
    alert="warning"
    message="Disable importing from GBIF?"
    okayButton="Disable"
    onOkay={confirmDisable}
    onCancel={() => (requestDisableConfirmation = false)}
  />
{/if}
