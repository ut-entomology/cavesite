<script lang="ts">
  import { type FittedModel, shortenValue } from '../lib/linear_regression';

  export let model: FittedModel;
</script>

<div class="row mt-1 stats">
  <div class="col-1" />
  <div class="col-4">{@html model.equation}</div>
  <div class="col">p-value {shortenValue(model.jstat.f.pvalue, 2)}</div>
  <div class="col">RMSE {shortenValue(model.rmse, 3)}</div>
  <div class="col">R<sup>2</sup> {shortenValue(model.jstat.R2, 2)}</div>
</div>

<style>
  .stats {
    font-size: 0.8rem;
  }
</style>
