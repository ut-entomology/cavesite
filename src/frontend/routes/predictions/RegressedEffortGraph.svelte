<script lang="ts" context="module">
  import { createSessionStore } from '../../util/session_store';

  interface AverageModelConfig {
    minX: number;
    minPointCount: number;
    weightPower: number;
  }

  const avgModelConfig = createSessionStore<AverageModelConfig>('avg_model_config', {
    minX: 8,
    minPointCount: 8,
    weightPower: 2
  });
</script>

<script lang="ts">
  import EffortGraph from './EffortGraph.svelte';
  import ResidualsPlot from './ResidualsPlot.svelte';
  import ModelStats from './ModelStats.svelte';
  import AboutAvgModel from './AboutAvgModel.svelte';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import type { EffortGraphSpec } from '../../../frontend-core/clusters/effort_graph_spec';
  import type { PowerFitModel } from '../../../frontend-core/clusters/power_fit_model';
  import type { ClusteringConfig } from '../../../frontend-core/clusters/clustering_config';
  import { createAverageModel } from '../../../frontend-core/clusters/model_averager';

  const MAX_MIN_X = 20;
  const MIN_MIN_POINT_COUNT = 3;
  const MAX_MIN_POINT_COUNT = 20;
  const WEIGHT_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  const X_UNITS_REGEX = /[^ ]+/;

  export let title: string;
  export let color: string;
  export let sourceDataSet: LocationGraphData[];
  export let graphSpec: EffortGraphSpec;
  export let clusteringConfig: ClusteringConfig;

  let minX = $avgModelConfig.minX;
  let minPointCount = $avgModelConfig.minPointCount;
  let maxPointCount: number;
  let weightPower = $avgModelConfig.weightPower;
  let minPointCountOptions: number[];
  let minXOptions: number[];
  let model: PowerFitModel | null;
  let modelGraphSpec: EffortGraphSpec;
  let fittedDataSet: LocationGraphData[];
  let showingInfoBox = false;

  $: xAxisUnits = graphSpec.xAxisLabel.match(X_UNITS_REGEX)![0];

  $: {
    maxPointCount = clusteringConfig.maxRecentPredictionPoints || Infinity;
    let maxMinPointCount = maxPointCount;
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

    minXOptions = [];
    for (let i = MIN_MIN_POINT_COUNT; i <= MAX_MIN_X; ++i) {
      minXOptions.push(i);
    }
  }

  $: avgModelConfig.set({
    minX,
    minPointCount,
    weightPower
  });

  $: {
    modelGraphSpec = Object.assign({}, graphSpec, {
      pointSliceSpec: {
        minPointCount,
        maxPointCount,
        recentPointsToIgnore: 0
      }
    });
    [model, fittedDataSet] = createAverageModel(
      sourceDataSet,
      modelGraphSpec,
      minX,
      weightPower
    );
  }

  function _minPointCountChanged() {
    if (minX < minPointCount) {
      minX = minPointCount;
    }
  }

  function _minXChanged() {
    if (minX < minPointCount) {
      minPointCount = minX;
    }
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
        graphSpec={modelGraphSpec}
        showPointSlice={true}
        {model}
      />
    </div>
  </div>
  <div class="row mb-3 gx-0 ms-4 stats">
    <div class="col-md-6">
      <ResidualsPlot {color} {model} {xAxisUnits} />
    </div>

    <div class="col-md-6 d-flex align-items-center">
      <div style="width: 100%">
        <div class="row">
          <div class="col-md-6">
            <div class="row mt-3 justify-content-center">
              <div class="col-5 text-end">
                <label for="inputMinPointCount" class="col-form-label"
                  >Min.&nbsp;pts.</label
                >
              </div>
              <div class="col-5">
                <select
                  id="inputMinPointCount"
                  bind:value={minPointCount}
                  class="form-select form-select-sm item_select"
                  on:change={_minPointCountChanged}
                >
                  {#each minPointCountOptions as option}
                    <option value={option}>{option}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div class="row justify-content-center">
              <div class="col-5 text-end">
                <label for="inputMinX" class="col-form-label">Min.&nbsp;x</label>
              </div>
              <div class="col-5">
                <select
                  id="inputMinX"
                  bind:value={minX}
                  class="form-select form-select-sm item_select"
                  on:change={_minXChanged}
                >
                  {#each minXOptions as option}
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

          <div class="col-md-6 d-flex align-items-center">
            <ModelStats {color} {model} />
          </div>
        </div>
        <div class="row mt-3">
          <div class="col text-center">
            <span class="link_text" on:click={() => (showingInfoBox = true)}
              >about this model</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="regression_placeholder">
    <div>Too few points to perform regression</div>
  </div>
{/if}

{#if showingInfoBox}
  <AboutAvgModel close={() => (showingInfoBox = false)} />
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
