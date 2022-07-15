<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import type { FittedModel } from './fitted_model';
  import type { SizedEffortGraphSpec } from './cluster_data';

  const POINTS_IN_MODEL_PLOT = 200;

  export let title: string;
  export let hexColor: string;
  export let spec: SizedEffortGraphSpec;
  export let model: FittedModel | null = null;
  export let yFormula: string | null = null;

  $: xAxisLabel = spec.graphSpecs[0].xAxisLabel;
  $: yAxisLabel = spec.graphSpecs[0].yAxisLabel;
  $: models = model === null ? [] : [model];

  function _legendFilter(item: any) {
    // When using a sized spec, show a legend for the first line and then
    // one for each model; otherwise show all legends.
    return (
      item.datasetIndex == 0 ||
      item.datasetIndex >= (spec as SizedEffortGraphSpec).graphSpecs.length
    );
  }
</script>

<Scatter
  data={{
    datasets: [
      ...spec.graphSpecs.map((graphSpec) => {
        return {
          showLine: true,
          label: spec.pointCount + ' points',
          data: graphSpec.points,
          // borderColor: _toLocationHexColor(i),
          borderWidth: 1,
          hoverBorderWidth: 3,
          hoverBorderColor: '#000000'
        };
      }),
      ...models.map((model) => {
        return {
          showLine: true,
          label: 'power fit of recent data',
          data: model.getModelPoints(POINTS_IN_MODEL_PLOT),
          backgroundColor: hexColor
        };
      })
    ]
  }}
  options={{
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: xAxisLabel + ' (x)',
          font: { size: 16 }
        }
      },
      y: {
        title: {
          display: true,
          text: yFormula ? `${yAxisLabel} (${yFormula})` : yAxisLabel,
          font: { size: 16 }
        }
      }
    },
    hover: {
      mode: 'dataset'
    },
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 17 }
      },
      legend: {
        labels: { filter: _legendFilter }
      }
    },
    animation: {
      duration: 0
    }
  }}
/>
