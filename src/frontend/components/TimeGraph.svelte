<script lang="ts">
  import Bar from 'svelte-chartjs/src/Bar.svelte';

  import type { TimeGraphSpec } from '../lib/time_graphs';

  export let spec: TimeGraphSpec;
</script>

<Bar
  data={{
    labels: spec.xValues,
    datasets: [
      ...spec.trendsByLifeStage.map((line) => {
        return {
          label: line.label,
          data: line.yValues,
          backgroundColor: '#' + line.hexColor,
          fill: true
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
          text: spec.xAxisLabel,
          font: { size: 16 }
        },
        stacked: true
      },
      y: {
        title: {
          display: true,
          text: spec.yAxisLabel,
          font: { size: 16 }
        },
        stacked: true
      }
    },
    plugins: {
      title: {
        display: true,
        text: spec.graphTitle,
        font: { size: 17 }
      }
    },
    animation: false
  }}
/>
