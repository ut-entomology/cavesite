<script lang="ts">
  import { shortenPValue, shortenRMSE, shortenR2 } from './regression';
  import type { PowerFitModel } from './power_fit_model';

  export let color: string;
  export let model: PowerFitModel;

  $: regression = model.regression;
  $: xFormula = model.getXFormula();
  $: pValue = shortenPValue(regression.jstats.f.pvalue);
  $: rmse = shortenRMSE(regression.rmse);
  $: r2 = shortenR2(regression.jstats.R2);
</script>

<div style="width: 100%">
  <div class="row mt-3">
    <div class="col-12 text-center">
      <span style="color: {color}">y</span> = {@html xFormula}
    </div>
  </div>
  <div class="row mt-2">
    <div class="col-6 text-end">p-value:</div>
    <div class="col-6">{pValue}</div>
  </div>
  <div class="row">
    <div class="col-6 text-end">RMSE:</div>
    <div class="col-6">{rmse} spp.</div>
  </div>
  <div class="row">
    <div class="col-6 text-end">R<sup>2</sup>:</div>
    <div class="col-6">{r2}</div>
  </div>
</div>

<style>
  span {
    font-weight: bold;
  }
</style>
