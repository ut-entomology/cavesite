<script lang="ts">
  import { shortenPValue, shortenRMSE, shortenR2 } from './regression';
  import type { PlottableModel } from './plottable_model';

  export let hexColor: string;
  export let model: PlottableModel;

  const regression = model.regression;
</script>

<div class="row mt-1 stats gx-0">
  <div class="col-1" />
  <div class="col-6">
    <span style="color: {hexColor}">y</span> = {@html model.getXFormula()}
  </div>
  <div class="col-2">p-value {shortenPValue(regression.jstats.f.pvalue)}</div>
  <div class="col">RMSE {shortenRMSE(regression.rmse)}</div>
  <div class="col">R<sup>2</sup> {shortenR2(regression.jstats.R2)}</div>
</div>

<style>
  .stats {
    font-size: 0.8rem;
  }
  span {
    font-weight: bold;
  }
</style>
