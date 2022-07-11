<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import type { PlottableModel } from '../lib/plottable_model';
  import type { SizedEffortGraphSpec } from '../lib/cluster_data';

  const POINTS_IN_MODEL_PLOT = 200;

  export let title: string;
  export let spec: SizedEffortGraphSpec;
  export let models: PlottableModel[] = [];
  export let yFormula: string | null = null;

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
          data:
            models.length > 0
              ? models[0].convertDataPoints(graphSpec.points)
              : graphSpec.points,
          // borderColor: _toLocationHexColor(i),
          borderWidth: 1,
          hoverBorderWidth: 3,
          hoverBorderColor: '#000000'
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
          text: spec.graphSpecs[0].xAxisLabel + ' (x)',
          font: { size: 16 }
        }
      },
      y: {
        title: {
          display: true,
          text: yFormula
            ? `${spec.graphSpecs[0].yAxisLabel} (${yFormula})`
            : spec.graphSpecs[0].yAxisLabel,
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
