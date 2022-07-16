<script lang="ts" context="module">
  import { createSessionStore } from '../../util/session_store';

  interface AverageModelConfig {
    minX: number;
    minPointCount: number;
    weightPower: number;
  }

  const avgModelConfig = createSessionStore<AverageModelConfig>('avg_model_config', {
    minX: 0,
    minPointCount: 8,
    weightPower: 2
  });
</script>

<script lang="ts">
  import EffortGraph from './EffortGraph.svelte';
  import ResidualsPlot from './ResidualsPlot.svelte';
  import ModelStats from './ModelStats.svelte';
  import type { LocationGraphData } from './location_graph_data';
  import type { EffortGraphSpec } from './effort_graph_spec';
  import { FittedModel } from './fitted_model';
  import type { ClusteringConfig } from './cluster_data';

  const MAX_MIN_X = 20;
  const MIN_MIN_POINT_COUNT = 3;
  const MAX_MIN_POINT_COUNT = 20;
  const WEIGHT_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];

  export let title: string;
  export let color: string;
  export let sourceDataSet: LocationGraphData[];
  export let graphSpec: EffortGraphSpec;
  export let clusteringConfig: ClusteringConfig;

  let minX = $avgModelConfig.minX;
  let minPointCount = $avgModelConfig.minPointCount;
  let weightPower = $avgModelConfig.weightPower;
  let minPointCountOptions: number[];
  let model: FittedModel | null;
  let fittedDataSet: LocationGraphData[];

  $: {
    let maxMinPointCount = clusteringConfig.maxPointsToRegress || Infinity;
    if (maxMinPointCount > MAX_MIN_POINT_COUNT) {
      maxMinPointCount = MAX_MIN_POINT_COUNT;
    }
    minPointCountOptions = [];
    for (let i = MIN_MIN_POINT_COUNT; i <= maxMinPointCount; ++i) {
      minPointCountOptions.push(i);
    }
    if (minPointCount > maxMinPointCount) {
      minPointCount = maxMinPointCount;
    }
  }

  $: avgModelConfig.set({
    minX,
    minPointCount,
    weightPower
  });

  $: {
    [model, fittedDataSet] = FittedModel.createFromDataSet(
      sourceDataSet,
      graphSpec,
      minPointCount,
      minX,
      weightPower
    );
  }
</script>

{#if model}
  <div class="row mt-3 mb-1">
    <div class="col" style="height: 350px">
      <EffortGraph
        {title}
        {color}
        totalCaves={sourceDataSet.length}
        graphDataSet={fittedDataSet}
        {graphSpec}
        {model}
      />
    </div>
  </div>
  <div class="row mb-3 gx-0 ms-4 stats">
    <div class="col-md-6">
      <ResidualsPlot {color} {model} />
    </div>

    <div class="col-md-3 d-flex align-items-center">
      <div style="width: 100%">
        <div class="row mt-3 justify-content-center">
          <div class="col-5 text-end">
            <label for="inputMinX" class="col-form-label">Min. x</label>
          </div>
          <div class="col-5">
            <select
              id="inputMinX"
              bind:value={minX}
              class="form-select form-select-sm item_select"
            >
              {#each { length: MAX_MIN_X + 1 } as _, option}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="row justify-content-center">
          <div class="col-5 text-end">
            <label for="inputMinPointCount" class="col-form-label">Min. pts.</label>
          </div>
          <div class="col-5">
            <select
              id="inputMinPointCount"
              bind:value={minPointCount}
              class="form-select form-select-sm item_select"
            >
              {#each minPointCountOptions as option}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="row justify-content-center">
          <div class="col-5 text-end">
            <label for="inputWeightPower" class="col-form-label">Weight</label>
          </div>
          <div class="col-5">
            <select
              id="inputWeightPower"
              bind:value={weightPower}
              class="form-select form-select-sm item_select"
            >
              {#each WEIGHT_OPTIONS as option}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="col-md-3 d-flex align-items-center">
      <ModelStats {color} {model} />
    </div>
  </div>
{:else}
  <div class="regression_placeholder">
    <div>Too few points to perform regression</div>
  </div>
{/if}

<style lang="scss">
  @import '../../variables.scss';

  .stats {
    font-size: 0.9rem;
  }

  .regression_placeholder {
    margin: 2rem 1rem 1rem 1rem;
    border-radius: $border-radius;
    border: 1px solid #aaa;
    padding: 0 0.5em;
  }
  .regression_placeholder div {
    font-weight: bold;
    font-size: 1.1rem;
    margin: 2rem 0;
    text-align: center;
    color: #aaa;
  }
</style>
