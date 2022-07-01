<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import type { PlottableModel } from '../lib/plottable_model';
  import type { SizedEffortGraphSpec } from '../lib/cluster_data';

  const POINTS_IN_MODEL_PLOT = 100;

  export let title: string;
  export let config: SizedEffortGraphSpec;
  export let models: PlottableModel[] = [];
  export let yFormula: string | null = null;

  function _legendFilter(item: any) {
    // Show a legend for the first line and then one for each model.
    return item.datasetIndex == 0 || item.datasetIndex >= config.graphSpecs.length;
  }
</script>

<Scatter
  data={{
    datasets: [
      ...config.graphSpecs.map((graphSpec) => {
        return {
          showLine: true,
          label: config.pointCount + ' points',
          data:
            models.length > 0
              ? models[0].convertDataPoints(graphSpec.points)
              : graphSpec.points
        };
      }),
      ...models.map((model) => {
        return {
          showLine: true,
          label: model.name,
          data: model.getModelPoints(POINTS_IN_MODEL_PLOT),
          backgroundColor: '#' + model.hexColor
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
          text: config.graphSpecs[0].xAxisLabel + ' (x)',
          font: { size: 16 }
        }
      },
      y: {
        title: {
          display: true,
          text: yFormula
            ? config.graphSpecs[0].yAxisLabel + ` (${yFormula})`
            : config.graphSpecs[0].yAxisLabel,
          font: { size: 16 }
        }
      }
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
