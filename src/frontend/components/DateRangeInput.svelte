<script lang="ts">
  import { localToInputDate, inputToLocalDate } from '../util/conversion';

  export let classes = '';
  export let fromDate: Date;
  export let throughDate: Date;
  export let setDateRange: (fromDate: Date, throughDate: Date) => void;

  let fromDateStr = localToInputDate(fromDate);
  let throughDateStr = localToInputDate(throughDate);

  console.log('initial date range:', fromDateStr, throughDateStr);

  function onFromChanged(_event: Event): void {
    console.log('from changed:', fromDateStr);
    let from = inputToLocalDate(fromDateStr);
    let thru = inputToLocalDate(throughDateStr);
    if (from.getTime() > thru.getTime()) {
      thru = from;
      throughDateStr = fromDateStr;
    }
    setDateRange(from, thru);
  }

  function onThroughChanged(_event: Event): void {
    console.log('through changed:', throughDateStr);
    let from = inputToLocalDate(fromDateStr);
    let thru = inputToLocalDate(throughDateStr);
    if (thru.getTime() < from.getTime()) {
      from = thru;
      fromDateStr = throughDateStr;
    }
    setDateRange(from, thru);
  }
</script>

<div class="row gx-2 {classes}">
  <div class="col-auto">From</div>
  <div class="col-auto">
    <input
      type="date"
      class="form-control date_picker"
      required={true}
      bind:value={fromDateStr}
      on:change={onFromChanged}
    />
  </div>
  <div class="col-auto">through</div>
  <div class="col-auto">
    <input
      type="date"
      class="form-control date_picker"
      required={true}
      bind:value={throughDateStr}
      on:change={onThroughChanged}
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
