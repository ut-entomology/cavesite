<script lang="ts">
  import { localToInputDate, inputToLocalDate } from '../util/conversion';

  export let classes = '';
  export let selectable = false;
  export let selected = true;
  export let from: Date;
  export let through: Date;
  export let earliestDate: Date;
  export let setDateRange: (
    fromDate: Date,
    throughDate: Date,
    selected: boolean
  ) => void;

  let fromStr = localToInputDate(from);
  let throughStr = localToInputDate(through);
  let fromDate: Date;
  let throughDate: Date;
  let earliestStr = localToInputDate(earliestDate);
  let latestStr = localToInputDate(new Date('2040-12-31'));

  $: fromDate = inputToLocalDate(fromStr);
  $: throughDate = inputToLocalDate(throughStr);

  function onToggle(): void {
    setDateRange(fromDate, throughDate, selected);
  }

  function onFromBlur(): void {
    if (fromStr == '') {
      fromStr = localToInputDate(from);
      fromDate = from;
    } else if (fromDate.getTime() > throughDate.getTime()) {
      throughDate = fromDate;
      throughStr = fromStr;
    }
    setDateRange(fromDate, throughDate, selected);
  }

  function onThroughBlur(): void {
    if (throughStr == '') {
      throughStr = localToInputDate(through);
      throughDate = through;
    } else if (throughDate.getTime() < fromDate.getTime()) {
      fromDate = throughDate;
      fromStr = throughStr;
    }
    setDateRange(fromDate, throughDate, selected);
  }

  function resetDates() {
    fromDate = earliestDate;
    fromStr = localToInputDate(earliestDate);
    throughDate = new Date();
    throughStr = localToInputDate(throughDate);
    setDateRange(fromDate, throughDate, selected);
  }
</script>

<div class="row gx-2 {classes}">
  {#if selectable}
    <div class="col-auto">
      <input
        type="checkbox"
        bind:checked={selected}
        class="form-check-input"
        aria-label="check to restrict dates"
        on:change={onToggle}
      />
    </div>
  {/if}
  <div class="col-auto">From</div>
  <div class="col-auto">
    <input
      type="date"
      class="form-control date_picker"
      disabled={!selected}
      required={true}
      min={earliestStr}
      max={latestStr}
      bind:value={fromStr}
      on:blur={onFromBlur}
    />
  </div>
  <div class="col-auto">through</div>
  <div class="col-auto">
    <input
      type="date"
      class="form-control date_picker"
      disabled={!selected}
      required={true}
      min={earliestStr}
      max={latestStr}
      bind:value={throughStr}
      on:blur={onThroughBlur}
    />
  </div>
  <div class="col-auto reset_icon">
    <span
      class:disabled={!selected}
      title="Reset dates"
      alt="Reset dates"
      on:click={resetDates}>&#x27F2;</span
    >
  </div>
</div>

<style lang="scss">
  @import '../variables.scss';

  :global(.date_picker) {
    margin-top: -0.1rem;
    width: 8.5rem;
    padding: 0.1rem 0.4rem;
    text-align: center;
    color: $blueLinkForeColor;
  }
  :global(.date_picker:disabled) {
    color: #aaa;
  }

  .reset_icon {
    margin-top: -0.2rem;
    margin-left: 0.1rem;
    user-select: none;
    font-size: 1.2rem;
    color: $blueLinkForeColor;
  }
  .reset_icon span {
    cursor: pointer;
  }
  .reset_icon .disabled {
    color: #aaa;
    cursor: default;
  }
</style>
