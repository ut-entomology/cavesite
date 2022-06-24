<script lang="ts">
  import { localToInputDate, inputToLocalDate } from '../util/conversion';

  export let classes = '';
  export let from: Date;
  export let through: Date;
  export let earliestDate: Date;
  export let setDateRange: (fromDate: Date, throughDate: Date) => void;

  let fromStr = localToInputDate(from);
  let throughStr = localToInputDate(through);
  let fromDate: Date;
  let throughDate: Date;
  let earliestStr = localToInputDate(earliestDate);
  let latestStr = localToInputDate(new Date('2040-12-31'));

  $: fromDate = inputToLocalDate(fromStr);
  $: throughDate = inputToLocalDate(throughStr);

  function onFromBlur(_event: Event): void {
    if (fromStr == '') {
      fromStr = localToInputDate(from);
      fromDate = from;
    } else if (fromDate.getTime() > throughDate.getTime()) {
      throughDate = fromDate;
      throughStr = fromStr;
    }
    setDateRange(fromDate, throughDate);
  }

  function onThroughBlur(_event: Event): void {
    if (throughStr == '') {
      throughStr = localToInputDate(through);
      throughDate = through;
    } else if (throughDate.getTime() < fromDate.getTime()) {
      fromDate = throughDate;
      fromStr = throughStr;
    }
    setDateRange(fromDate, throughDate);
  }
</script>

<div class="row gx-2 {classes}">
  <div class="col-auto">From</div>
  <div class="col-auto">
    <input
      type="date"
      class="form-control date_picker"
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
      required={true}
      min={earliestStr}
      max={latestStr}
      bind:value={throughStr}
      on:blur={onThroughBlur}
    />
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
</style>
