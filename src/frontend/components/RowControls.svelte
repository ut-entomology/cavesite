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
  <div class="col-auto row_position">
    Rows {firstRowNumber} - {lastRowNumber} of {totalRows}
  </div>
  <div class="col" />
  <div class="col-auto">
    <button
      class="btn btn-minor"
      type="button"
      on:click={config.toFirstSet}
      title="Jump to first row">|&lt;</button
    >
    <button
      class="btn btn-minor"
      type="button"
      on:click={config.bigStepBack}
      title="Step back {config.bigStepRows} rows">&lt;&lt;</button
    >
    <button
      class="btn btn-minor"
      type="button"
      on:click={config.smallStepBack}
      title="Step back {config.smallStepRows} rows">&lt;</button
    >
  </div>
  <div class="col-auto">
    <button
      class="btn btn-minor"
      type="button"
      on:click={config.smallStepForward}
      title="Step forward {config.smallStepRows} rows">&gt;</button
    >
    <button
      class="btn btn-minor"
      type="button"
      on:click={config.bigStepForward}
      title="Step forward {config.bigStepRows} rows">&gt;&gt;</button
    >
    <button
      class="btn btn-minor"
      type="button"
      on:click={config.toLastSet}
      title="Jump to last row">&gt;|</button
    >
  </div>
</div>

<style>
  .row_position {
    line-height: 1.8rem;
  }

  .row_controls {
    margin: 0;
  }

  .row_controls button {
    margin: 0 0.15rem;
    padding: 0 0.5rem;
    font-family: Verdana, Geneva, sans-serif;
    font-size: 1rem;
    font-weight: bold;
    letter-spacing: -0.1em;
  }
</style>
