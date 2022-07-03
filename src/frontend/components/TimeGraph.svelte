<script lang="ts">
  import Line from 'svelte-chartjs/src/Line.svelte';

  import type { TimeGraphSpec } from '../lib/time_graphs';

  export let spec: TimeGraphSpec;
</script>

<Line
  data={{
    labels: spec.xValues,
    datasets: [
      ...spec.lifeStageLines.map((line) => {
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
        }
      },
      y: {
        title: {
          display: true,
          text: spec.yAxisLabel,
          font: { size: 16 }
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: spec.graphTitle,
        font: { size: 17 }
      }
    },
    animation: {
      duration: 0
    }
  }}
/>
