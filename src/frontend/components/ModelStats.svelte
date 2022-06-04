<script lang="ts" context="module">
  export interface JstatModel {
    coef: number[];
    R2: number;
    t: { p: number[] };
    f: { pvalue: number };
    rmse: number;
    html: string;
  }
</script>

<script lang="ts">
  const STAT_PRECISION = 3;

  export let model: JstatModel;
</script>

<div class="row mb-3">
  <div class="col-1" />
  <div class="col-4">{@html model.html}</div>
  <div class="col">p-value {model.f.pvalue.toPrecision(STAT_PRECISION)}</div>
  <div class="col">RMSE {model.rmse.toPrecision(STAT_PRECISION)}</div>
  <div class="col">R<sup>2</sup> {model.R2.toPrecision(STAT_PRECISION)}</div>
</div>
