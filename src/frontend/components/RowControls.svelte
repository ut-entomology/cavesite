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
  Rows {firstRowNumber} - {lastRowNumber} of {totalRows}
</div>
<div class="buttons">
  <button class="btn btn-minor" type="button" on:click={config.toFirstSet}
    ><span>|&lt;</span> Start</button
  >
  <button class="btn btn-minor" type="button" on:click={config.bigStepBack}
    ><span>&lt;&lt;</span> -{config.bigStepRows}</button
  >
  <button class="btn btn-minor" type="button" on:click={config.smallStepBack}
    ><span>&lt;</span> -{config.smallStepRows}</button
  >
  <button class="btn btn-minor" type="button" on:click={config.smallStepForward}
    >+{config.smallStepRows} <span>&gt;</span></button
  >
  <button class="btn btn-minor" type="button" on:click={config.bigStepForward}
    >+{config.bigStepRows} <span>&gt;&gt;</span></button
  >
  <button class="btn btn-minor" type="button" on:click={config.toLastSet}
    >End <span>&gt;|</span></button
  >
</div>

<style>
  .row_info {
    display: inline-block;
    vertical-align: middle;
  }

  .buttons {
    display: inline-block;
    margin-left: 2rem;
    font-family: Verdana, Geneva, sans-serif;
  }

  .buttons button {
    padding: 0 0.5rem;
  }

  button span {
    font-weight: bold;
    letter-spacing: -0.1em;
  }
</style>
