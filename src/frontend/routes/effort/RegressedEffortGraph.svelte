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
  import InfoDialog from '../../dialogs/InfoDialog.svelte';
  import type { LocationGraphData } from './location_graph_data';
  import type { EffortGraphSpec } from './effort_graph_spec';
  import type { PowerFitModel } from './power_fit_model';
  import type { ClusteringConfig } from './cluster_data';
  import { createAverageModel } from './model_averager';

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
  let model: PowerFitModel | null;
  let fittedDataSet: LocationGraphData[];
  let showingInfoBox = false;

  $: xAxisUnits = graphSpec.xAxisLabel.match(X_UNITS_REGEX)![0];

  $: {
    maxPointCount = clusteringConfig.maxPointsToRegress || Infinity;
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
  }

  $: avgModelConfig.set({
    minX,
    minPointCount,
    weightPower
  });

  $: {
    [model, fittedDataSet] = createAverageModel(
      sourceDataSet,
      graphSpec,
      minPointCount,
      maxPointCount,
      minX,
      weightPower
    );
  }

  function _openAboutModel() {
    showingInfoBox = true;
  }

  function _closeAboutModel() {
    showingInfoBox = false;
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
                >
                  {#each { length: MAX_MIN_X + 1 } as _, option}
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
            <span class="about_model_link" on:click={_openAboutModel}
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
  <InfoDialog
    title="About the Average Model"
    classes="about_model_box"
    maxWidth="45rem"
    onClose={_closeAboutModel}
  >
    This model helps you understand the average rate at which additional species are
    found in the caves of this cluster. To produce this model, each cave is separately
    regressed and modeled to fit an equation of the form <span class="eq"
      >y<sub>k</sub> = A x<sup>P</sup> + B</span
    >. The points
    <span class="eq"
      >(x, (&Sigma; y<sub>k</sub>*w<sub>k</sub>)/(&Sigma; w<sub>k</sub>))</span
    >
    are then plotted, where <span class="eq">w<sub>k</sub></span> is the weight of cave
    <span class="eq">k</span>, and a new model is generated from these points to fit the
    same equation. The result is a weighted average of the individual cave models.

    <ul>
      <li>
        The "Min. pts." input specifies the minimum number of points that must occur in
        a cave for the cave's data to be included in the average model.
      </li>
      <li>
        The "Min. x." input specifies the minimum value of x (visits or person-visits)
        that the cave must have reached in order for the cave's data to be included in
        the average model.
      </li>
      <li>
        The "Weight" input provides the magnitude of the weighting <span class="eq"
          >W</span
        >, so that
        <span class="eq"
          >w<sub>k</sub>=<i>max</i>(&cup;{'{'}x<sub>ki</sub>{'}'})<sup>W</sup></span
        >, where
        <span class="eq">x<sub>ki</sub></span>
        are the x values of cave <span class="eq">k</span>. Higher values of
        <span class="eq">W</span> therefore bias the model toward caves having more visits
        or person-visits (the x values).
      </li>
      <li>
        The scatter and residuals plots only show data for caves that were included in
        the average model, and they only show the points actually being regressed,
        according to the selected maximum number of recent points to regress. The
        scatter plot's title indicates both the number of caves used in the average
        model and the total number of caves in the cluster.
      </li>
      <li>
        <b>IMPORTANT:</b> This modeling makes the largely false assumption that researchers
        collect at least one specimen on each visit to each cave and deposit that specimen
        in the UT Biospeleological collection; receipt of a specimen is what indicates a
        visit to the cave. The models are therefore a reflection of both natural conditions
        and human behavior.
      </li>
    </ul>
  </InfoDialog>
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

  .about_model_link {
    color: $blueLinkForeColor;
    text-decoration: underline;
    cursor: pointer;
  }
  :global(.about_model_box) {
    font-size: 0.95rem;
  }

  ul {
    margin: 1rem 0 -0.5rem 0;
  }
  li {
    margin: 0.5rem 0;
  }

  .eq {
    font-family: 'Courier New', Courier, monospace;
  }
</style>
