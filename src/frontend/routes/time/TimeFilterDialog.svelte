<script lang="ts" context="module">
  export interface TimeGraphQueryRequest {
    fromDateMillis: number;
    throughDateMillis: number;
    filterTaxa: boolean;
    filterLocations: boolean;
    onlySGCN: boolean;
    onlyFederallyListed: boolean;
  }
</script>

<script lang="ts">
  import ModalDialog from '../../common/ModalDialog.svelte';
  import DateRangeInput from '../../components/DateRangeInput.svelte';
  import FilterSelector from '../../components/FilterSelector.svelte';
  import { EARLIEST_RECORD_DATE } from '../../../shared/general_query';

  export let initialQueryRequest: TimeGraphQueryRequest;
  export let onClose: () => void;
  export let onSubmit: (queryRequest: TimeGraphQueryRequest) => void;

  let fromDate = new Date(initialQueryRequest.fromDateMillis);
  let throughDate = new Date(initialQueryRequest.throughDateMillis);
  let filterTaxa = initialQueryRequest.filterTaxa;
  let filterLocations = initialQueryRequest.filterLocations;
  let onlySGCN = initialQueryRequest.onlySGCN;
  let onlyFederallyListed = initialQueryRequest.onlyFederallyListed;

  function submit() {
    onSubmit({
      fromDateMillis: fromDate.getTime(),
      throughDateMillis: throughDate.getTime(),
      filterTaxa,
      filterLocations,
      onlySGCN,
      onlyFederallyListed
    });
  }

  function _setDateRange(from: Date, thru: Date): void {
    fromDate = from;
    throughDate = thru;
  }

  function setFilters(taxa: boolean, locations: boolean): string {
    filterTaxa = taxa;
    filterLocations = locations;

    return `retrieving ${taxa ? 'selected taxa' : 'cave obligates'} and ${
      locations ? 'selected' : 'all'
    } locations`;
  }
</script>

<ModalDialog title="Generate Time Charts" contentClasses="time-filter-content">
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

  <FilterSelector {filterTaxa} {filterLocations} {setFilters} />

  <div class="row mt-3 ms-4 gx-2">
    <div class="col-auto form-check checkable">
      <input
        id="sgcn_checkbox"
        type="checkbox"
        bind:checked={onlySGCN}
        class="form-check-input"
      />
      <label class="form-check-label" for="sgcn_checkbox"
        >Further restrict to records for <b>SGCN</b> species</label
      >
    </div>
  </div>
  <div class="row ms-4 mb-2 gx-2">
    <div class="col-auto form-check checkable">
      <input
        id="federally_listed_checkbox"
        type="checkbox"
        bind:checked={onlyFederallyListed}
        class="form-check-input"
      />
      <label class="form-check-label" for="federally_listed_checkbox"
        >Further restrict to records for <b>federally listed</b> species</label
      >
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
  @import '../../variables.scss';

  .dialog_controls button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }
</style>
