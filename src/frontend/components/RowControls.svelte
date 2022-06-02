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

<div class="row row_controls">
  <div class="col-auto">
    <button class="btn btn-minor" type="button" on:click={config.toFirstSet}
      ><span>|&lt;</span> Start</button
    >
    <button class="btn btn-minor" type="button" on:click={config.bigStepBack}
      ><span>&lt;&lt;</span> -{config.bigStepRows}</button
    >
    <button class="btn btn-minor" type="button" on:click={config.smallStepBack}
      ><span>&lt;</span> -{config.smallStepRows}</button
    >
  </div>
  <div class="col-auto position">
    Rows {firstRowNumber} - {lastRowNumber} of {totalRows}
  </div>
  <div class="col-auto">
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
</div>

<style>
  .position {
    line-height: 1.8rem;
  }

  .row_controls button {
    margin: 0 0.1rem;
    padding: 0 0.5rem;
    font-family: Verdana, Geneva, sans-serif;
    font-size: 0.9rem;
  }

  button span {
    font-size: 1rem;
    font-weight: bold;
    letter-spacing: -0.1em;
  }
</style>
