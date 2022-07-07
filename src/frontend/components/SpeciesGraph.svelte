<script lang="ts">
  import Line from 'svelte-chartjs/src/Line.svelte';

  import type { TimeGraphSpec } from '../lib/time_graphs';

  export let spec: TimeGraphSpec;
</script>

<Line
  data={{
    labels: spec.xValues,
    datasets: [
      ...spec.trendsByLifeStage.reverse().map((trend) => {
        return {
          label: trend.label,
          data: trend.yValues,
          borderWidth: 1,
          borderColor: trend.plotColor,
          backgroundColor: trend.fillColor,
          fill: true
        };
      })
    ]
  }}
  options={{
    maintainAspectRatio: false,
    scales: {
      y: {
        title: {
          display: true,
          text: spec.yAxisLabel,
          font: { size: 16 }
        },
        ticks: {
          precision: 0
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
    elements: {
      point: {
        radius: 0
      }
    },
    animation: false
  }}
/>
