<script lang="ts">
  import { shortenPValue, shortenRMSE, shortenR2 } from './regression';
  import type { FittedModel } from './fitted_model';

  export let color: string;
  export let model: FittedModel;

  const regression = model.regression;
</script>

<div class="stats">
  <div class="row">
    <div class="col-12 text-center">
      <span style="color: {color}">y</span> = {@html model.getXFormula()}
    </div>
  </div>
  <div class="row mt-2">
    <div class="col-6 text-end">p-value:</div>
    <div class="col-6">{shortenPValue(regression.jstats.f.pvalue)}</div>
  </div>
  <div class="row">
    <div class="col-6 text-end">RMSE:</div>
    <div class="col-6">{shortenRMSE(regression.rmse)} species</div>
  </div>
  <div class="row">
    <div class="col-6 text-end">R<sup>2</sup>:</div>
    <div class="col-6">{shortenR2(regression.jstats.R2)}</div>
  </div>
</div>

<style>
  .stats {
    font-size: 0.9rem;
    width: 100%;
  }
  span {
    font-weight: bold;
  }
</style>
