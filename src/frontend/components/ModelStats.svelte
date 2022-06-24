<script lang="ts">
  import {
    type PlottableModel,
    shortenPValue,
    shortenRMSE,
    shortenR2
  } from '../lib/linear_regression';

  export let model: PlottableModel;
</script>

<div class="row mt-1 stats gx-0">
  <div class="col-1" />
  <div class="col-6">
    <span style="color: #{model.hexColor}">{@html model.getYFormula()}</span> = {@html model.getXFormula()}
  </div>
  <div class="col-2">p-value {shortenPValue(model.jstats.f.pvalue)}</div>
  <div class="col">RMSE {shortenRMSE(model.rmse)}</div>
  <div class="col">R<sup>2</sup> {shortenR2(model.jstats.R2)}</div>
</div>

<style>
  .stats {
    font-size: 0.8rem;
  }
  span {
    font-weight: bold;
  }
</style>
