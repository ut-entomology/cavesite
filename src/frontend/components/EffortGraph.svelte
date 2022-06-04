<script lang="ts" context="module">
  import type { Point, RegressionModel } from '../lib/linear_regression';

  export interface EffortGraphConfig {
    locationCount: number;
    graphTitle: string;
    xAxisLabel: string;
    yAxisLabel: string;
    pointCount: number;
    points: Point[];
  }
</script>

<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  export let title: string;
  export let config: EffortGraphConfig;
  export let models: RegressionModel[];
  export let modelPlots: Point[][];
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
          text: config.xAxisLabel,
          font: { size: 16 }
        }
      },
      y: {
        title: {
          display: true,
          text: config.yAxisLabel,
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
