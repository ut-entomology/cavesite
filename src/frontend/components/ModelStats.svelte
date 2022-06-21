<script lang="ts">
  import { type PlottableModel, shortenValue } from '../lib/linear_regression';

  export let model: PlottableModel;
</script>

<div class="row mt-1 stats">
  <div class="col-1" />
  <div class="col-4">
    <span style="color: #{model.hexColor}">{@html model.getYFormula()}</span> = {@html model.getXFormula()}
  </div>
  <div class="col">p-value {shortenValue(model.jstats.f.pvalue, 2)}</div>
  <div class="col">RMSE {shortenValue(model.rmse, 3)}</div>
  <div class="col">R<sup>2</sup> {shortenValue(model.jstats.R2, 2)}</div>
</div>

<style>
  .stats {
    font-size: 0.8rem;
  }
  span {
    font-weight: bold;
  }
</style>
