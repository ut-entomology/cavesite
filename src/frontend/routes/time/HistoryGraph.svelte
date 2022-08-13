<script lang="ts">
  import Bar from 'svelte-chartjs/src/Bar.svelte';

  import { LifeStage } from '../../../frontend-core/time/time_query';
  import type { TimeGraphSpec } from '../../lib/time_graphs';

  const BACKGROUND_DATA_FILL_COLOR = '#e8e8e8';

  export let spec: TimeGraphSpec;
  export let backgroundSpec: TimeGraphSpec | null;

  let backgroundDataset: any[];
  let xValues: (string | number)[];

  $: additiveText = spec.isAdditive ? ' (additive)' : ' (non-additive)';

  $: {
    if (!backgroundSpec) {
      xValues = spec.xValues;
      backgroundDataset = [];
    } else {
      xValues = Array.from(backgroundSpec.xValues);
      xValues.unshift('');
      xValues.push('');

      const bkgYValues = Array.from(
        backgroundSpec.trendsByLifeStage[LifeStage.All].yValues
      );
      bkgYValues.unshift(0);
      bkgYValues.push(0);
      backgroundDataset = [
        {
          type: 'line',
          stepped: 'middle',
          label: 'visits',
          data: bkgYValues,
          backgroundColor: BACKGROUND_DATA_FILL_COLOR,
          borderWidth: 0,
          fill: true
        }
      ];
    }
  }
</script>

<Bar
  data={{
    labels: xValues,
    datasets: [
      ...spec.trendsByLifeStage.map((trend) => {
        let yValues = trend.yValues;
        if (backgroundDataset) {
          yValues = new Array(xValues.length).fill(0);
          const offset = xValues.indexOf(spec.xValues[0]);
          for (let i = 0; i < trend.yValues.length; ++i) {
            yValues[i + offset] = trend.yValues[i];
          }
        }

        return {
          label: trend.label,
          data: yValues,
          backgroundColor: trend.plotColor,
          fill: true
        };
      }),
      ...backgroundDataset
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
    animation: false,
    elements: {
      point: {
        radius: 0
      }
    }
  }}
/>
