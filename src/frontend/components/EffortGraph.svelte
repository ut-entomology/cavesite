<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import type { Point, PlottableModel } from '../lib/linear_regression';
  import type { EffortGraphSpec } from '../lib/effort_graphs';

  export let title: string;
  export let config: EffortGraphSpec;
  export let models: PlottableModel[] = [];
  export let modelPlots: Point[][] = [];
  export let yFormula: string | null = null;
</script>

<Scatter
  data={{
    datasets: [
      {
        label: config.pointCount + ' points',
        data: config.points
      },
      ...models.map((model, i) => {
        return {
          type: 'line',
          label: model.name,
          data: modelPlots[i],
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
          text: config.xAxisLabel + ' (x)',
          font: { size: 16 }
        }
      },
      y: {
        title: {
          display: true,
          text: yFormula ? config.yAxisLabel + ` (${yFormula})` : null,
          font: { size: 16 }
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 17 }
      }
    },
    animation: {
      duration: 0
    }
  }}
/>
