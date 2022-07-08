<script lang="ts">
  import Bar from 'svelte-chartjs/src/Bar.svelte';

  import type { TimeGraphSpec } from '../lib/time_graphs';

  export let spec: TimeGraphSpec;

  $: additiveText = spec.isAdditive ? ' (additive)' : ' (non-additive)';
</script>

<Bar
  data={{
    labels: spec.xValues,
    datasets: [
      ...spec.trendsByLifeStage.map((trend) => {
        return {
          label: trend.label,
          data: trend.yValues,
          backgroundColor: trend.plotColor,
          fill: true
        };
      })
    ]
  }}
  options={{
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: spec.isAdditive
      },
      y: {
        title: {
          display: true,
          text: spec.yAxisLabel + additiveText,
          font: { size: 16 }
        },
        min: 0,
        ticks: {
          precision: 0
        },
        stacked: spec.isAdditive
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
