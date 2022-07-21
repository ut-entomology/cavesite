<script lang="ts">
  import { selectedLocations } from '../stores/selectedLocations';
  import { selectedTaxa } from '../stores/selectedTaxa';

  export let filterTaxa: boolean;
  export let filterLocations: boolean;
  export let setFilters: (filterTaxa: boolean, filterLocations: boolean) => string;

  const canFilterTaxa = $selectedTaxa !== null && Object.keys($selectedTaxa).length > 0;
  const canFilterLocations =
    $selectedLocations !== null && Object.keys($selectedLocations).length > 0;

  if (!canFilterTaxa) filterTaxa = false;
  if (!canFilterLocations) filterLocations = false;

  $: summary = setFilters(filterTaxa, filterLocations);
</script>

<div class="row justify-content-center mt-3 mb-2">
  <div class="col-auto">
    Restrict results to selected:
    <span class="form-check form-check-inline ms-2">
      <input
        type="checkbox"
        bind:checked={filterTaxa}
        class="form-check-input"
        aria-label="filter by taxa"
        disabled={!canFilterTaxa}
      />
      <label class="form-check-label" for="taxonFilterSwitch">taxa</label>
    </span>
    <span class="form-check form-check-inline">
      <input
        type="checkbox"
        bind:checked={filterLocations}
        class="form-check-input"
        aria-label="filter by locations"
        disabled={!canFilterLocations}
      />
      <label class="form-check-label" for="locationFilterSwitch">locations</label>
    </span>
  </div>

  <div class="row justify-content-center">
    <div class="col-auto summary_line">({summary})</div>
  </div>
</div>

<style>
  .summary_line {
    color: #999;
  }
</style>
