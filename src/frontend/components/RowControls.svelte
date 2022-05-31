<script lang="ts" context="module">
  export interface RowControlsConfig {
    smallStepRows: number;
    bigStepRows: number;
    toFirstSet: () => void;
    bigStepBack: () => void;
    smallStepBack: () => void;
    smallStepForward: () => void;
    bigStepForward: () => void;
    toLastSet(): void;
  }
</script>

<script lang="ts">
  export let firstRowNumber: number;
  export let lastRowNumber: number;
  export let totalRows: number;
  export let config: RowControlsConfig;
</script>

<div class="row_info">
  Rows {firstRowNumber} - {lastRowNumber} (of {totalRows})
</div>
<button class="btn btn-minor" type="button" on:click={config.toFirstSet}
  >&VerticalSeperator;&ltrif; Start</button
>
<button class="btn btn-minor" type="button" on:click={config.bigStepBack}
  >&ltrif;&ltrif; -{config.bigStepRows}</button
>
<button class="btn btn-minor" type="button" on:click={config.smallStepBack}
  >&ltrif; -{config.smallStepRows}</button
>
<button class="btn btn-minor" type="button" on:click={config.smallStepForward}
  >+{config.smallStepRows} &rtrif;</button
>
<button class="btn btn-minor" type="button" on:click={config.bigStepForward}
  >+{config.bigStepRows} &rtrif;&rtrif;</button
>
<button class="btn btn-minor" type="button" on:click={config.toLastSet}
  >End &rtrif;&VerticalSeperator;</button
>

<style>
  .row_info {
    display: inline-block;
  }
</style>
