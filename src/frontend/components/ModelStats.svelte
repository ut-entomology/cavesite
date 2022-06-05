<script lang="ts">
  import type { RegressionModel } from '../lib/linear_regression';

  const STAT_PRECISION = 3;

  export let model: RegressionModel;
</script>

<div class="row mb-3 stats">
  <div class="col-1" />
  <div class="col-4">{@html model.html}</div>
  <div class="col">p-value {model.jstat.f.pvalue.toPrecision(STAT_PRECISION)}</div>
  <div class="col">RMSE {model.rmse.toPrecision(STAT_PRECISION)}</div>
  <div class="col">R<sup>2</sup> {model.jstat.R2.toPrecision(STAT_PRECISION)}</div>
</div>

<style>
  .stats {
    font-size: 0.8rem;
  }
</style>
