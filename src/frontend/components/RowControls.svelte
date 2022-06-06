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

<div class="row row_controls ms-2 me-2 gx-0">
  <div class="col-sm-5 align-self-start info_text">
    Rows {firstRowNumber} - {lastRowNumber} of {totalRows}
  </div>
  <div class="col-sm-7 align-self-end">
    <div class="row justify-content-end">
      <div class="col-auto">
        <button
          class="btn btn-minor"
          type="button"
          title="Jump to first row"
          on:click={config.toFirstSet}
          disabled={firstRowNumber == 1}>|&lt;</button
        >
        <button
          class="btn btn-minor"
          type="button"
          title="Step back {config.bigStepRows} rows"
          on:click={config.bigStepBack}
          disabled={firstRowNumber == 1}>&lt;&lt;</button
        >
        <button
          class="btn btn-minor"
          type="button"
          title="Step back {config.smallStepRows} rows"
          on:click={config.smallStepBack}
          disabled={firstRowNumber == 1}>&lt;</button
        >
      </div>
      <div class="col-auto">
        <button
          class="btn btn-minor"
          type="button"
          title="Step forward {config.smallStepRows} rows"
          on:click={config.smallStepForward}
          disabled={lastRowNumber == totalRows}>&gt;</button
        >
        <button
          class="btn btn-minor"
          type="button"
          title="Step forward {config.bigStepRows} rows"
          on:click={config.bigStepForward}
          disabled={lastRowNumber == totalRows}>&gt;&gt;</button
        >
        <button
          class="btn btn-minor"
          type="button"
          title="Jump to last row"
          on:click={config.toLastSet}
          disabled={lastRowNumber == totalRows}>&gt;|</button
        >
      </div>
    </div>
  </div>
</div>

<style>
  .info_text {
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
