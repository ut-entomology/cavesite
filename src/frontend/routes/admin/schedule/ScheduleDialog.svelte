<script lang="ts" context="module">
  export function toHourString(hourInteger: number): string {
    return _toTimeString(hourInteger) + ' - ' + _toTimeString(hourInteger + 1);
  }

  function _toTimeString(hourInteger: number): string {
    if (hourInteger == 24) hourInteger = 0;
    const pm = hourInteger >= 12;
    let ampmHour = pm ? hourInteger - 12 : hourInteger;
    if (ampmHour == 0) ampmHour = 12;
    return ampmHour + (pm ? ' pm' : ' am');
  }
</script>

<script lang="ts">
  import ModalDialog from '../../../common/ModalDialog.svelte';
  import { type ImportSchedule, daysOfWeek } from '../../../../shared/data_keys';

  export let initialSchedule: ImportSchedule;
  export let submit: (schedule: ImportSchedule) => void;
  export let close: () => void;

  let hourOfDay = initialSchedule.importHourOfDay;
  let daysOfWeekChecks: boolean[] = [];
  for (let i = 0; i < 7; ++i) {
    daysOfWeekChecks[i] = initialSchedule.importDaysOfWeek.includes(i);
  }

  function onSubmit() {
    const importDaysOfWeek: number[] = [];
    for (let i = 0; i < 7; ++i) {
      if (daysOfWeekChecks[i]) importDaysOfWeek.push(i);
    }
    submit({
      importHourOfDay: hourOfDay,
      importDaysOfWeek
    });
  }
</script>

<ModalDialog title="Schedule GBIF Imports" contentClasses="schedule-imports-dialog">
  <div class="row mb-2">
    <div class="col">
      Specify the days and hour for importing records from GBIF. The system
      administrator configures the exact minute of the hour at which an import begins,
      as the importer wakes up at this minute every hour to see whether you've requested
      an import for that hour. Each import entirely replaces all of the records with
      those found in GBIF, allowing records to be added, removed, and changed. Only
      Texas records with accession number '002022c' are imported. GBIF reports this
      accession number as collection code 'Biospeleology'.
    </div>
  </div>

  <div class="container-fluid fields">
    <div class="row mt-3 mb-2 gx-2 justify-content-evenly">
      <div class="col-sm-3">
        {#each { length: 7 } as _, day}
          {@const dayName = daysOfWeek[day]}
          <div class="row">
            <div class="col weekdays">
              <input
                id="{dayName}_checkbox"
                type="checkbox"
                bind:checked={daysOfWeekChecks[day]}
                class="form-check-input"
              />
              <label class="form-check-label" for="{dayName}_checkbox">{dayName}</label>
            </div>
          </div>
        {/each}
      </div>
      <div class="col-sm-4 text-center">
        <label for="hour_input">Hour of day</label>
        <select
          id="hour_input"
          bind:value={hourOfDay}
          class="form-select form-select-sm item_select"
        >
          {#each { length: 24 } as _, hour}
            <option value={hour}>{toHourString(hour)}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <div class="dialog_controls row g-2">
    <div class="col-12 text-center">
      <button class="btn btn-minor" type="button" on:click={close}>Cancel</button>
      <button class="btn btn-major" type="button" on:click={onSubmit}>Submit</button>
    </div>
  </div>
</ModalDialog>

<style lang="scss">
  .weekdays input {
    margin-right: 0.5rem;
  }
  #hour_input {
    margin-top: 0.5rem;
  }
  .dialog_controls button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }
</style>
