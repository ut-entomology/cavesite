<script lang="ts" context="module">
  export interface TimeGraphQueryRequest {
    fromDateMillis: number;
    throughDateMillis: number;
    filterTaxa: boolean;
    filterLocations: boolean;
  }
</script>

<script lang="ts">
  import ModalDialog from '../common/ModalDialog.svelte';
  import DateRangeInput from '../components/DateRangeInput.svelte';
  import { EARLIEST_RECORD_DATE } from '../../shared/general_query';

  export let initialQueryRequest: TimeGraphQueryRequest;
  export let onClose: () => void;
  export let onSubmit: (queryRequest: TimeGraphQueryRequest) => void;

  let fromDate = new Date(initialQueryRequest.fromDateMillis);
  let throughDate = new Date(initialQueryRequest.throughDateMillis);
  let filterTaxa = initialQueryRequest.filterTaxa;
  let filterLocations = initialQueryRequest.filterLocations;

  function submit() {
    onSubmit({
      fromDateMillis: fromDate.getTime(),
      throughDateMillis: throughDate.getTime(),
      filterTaxa,
      filterLocations
    });
  }

  function _setDateRange(from: Date, thru: Date): void {
    fromDate = from;
    throughDate = thru;
  }
</script>

<ModalDialog
  title="Generate Time Charts"
  contentClasses="time-filter-content"
  dialogClasses="time-filter-dialog"
>
  <div class="row mb-4">
    <div class="col">
      Specify the criteria for generating new charts. When not restricting to selected
      taxa, results are restricted to cave obligates.
    </div>
  </div>
  <DateRangeInput
    classes="justify-content-center mb-4"
    from={fromDate}
    through={throughDate}
    earliestDate={EARLIEST_RECORD_DATE}
    setDateRange={_setDateRange}
  />

  <div class="row justify-content-center mt-3 mb-1">
    <div class="col-auto">
      Restrict results to selected:
      <span class="form-check form-check-inline ms-2">
        <input
          type="checkbox"
          bind:checked={filterTaxa}
          class="form-check-input"
          aria-label="filter by taxa"
        />
        <label class="form-check-label" for="taxonFilterSwitch">taxa</label>
      </span>
      <span class="form-check form-check-inline">
        <input
          type="checkbox"
          bind:checked={filterLocations}
          class="form-check-input"
          aria-label="filter by locations"
        />
        <label class="form-check-label" for="locationFilterSwitch">locations</label>
      </span>
    </div>
  </div>
  <div class="row justify-content-center mb-3">
    <div class="col-auto obligate_restriction">
      ({filterTaxa ? 'Not restricted' : 'Restricted'} to cave obligates.)
    </div>
  </div>

  <div class="dialog_controls row g-2">
    <div class="col-12 text-center">
      <button class="btn btn-minor" type="button" on:click={onClose}>Cancel</button>
      <button class="btn btn-major" type="button" on:click={submit}>Submit</button>
    </div>
  </div>
</ModalDialog>

<style lang="scss">
  @import '../variables.scss';

  .dialog_controls button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }
  .obligate_restriction {
    color: #999;
  }
</style>
