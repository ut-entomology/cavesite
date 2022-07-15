<script lang="ts" context="module">
  import type { ClusterPoints } from './cluster_data';

  export interface EffortGraphSpec {
    graphTitle: string;
    xAxisLabel: string;
    yAxisLabel: string;
    multiPointSet: ClusterPoints;
  }
</script>

<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import type { FittedModel } from './fitted_model';

  const POINTS_IN_MODEL_PLOT = 200;

  export let hexColor: string;
  export let spec: EffortGraphSpec;
  export let title = spec.graphTitle;
  export let model: FittedModel | null = null;

  $: xAxisLabel = spec.xAxisLabel;
  $: yAxisLabel = spec.yAxisLabel;
  $: models = model === null ? [] : [model];

  function _legendFilter(item: any) {
    return (
      item.datasetIndex == 0 || item.datasetIndex >= spec.multiPointSet.pointSets.length
    );
  }
</script>

<Scatter
  data={{
    datasets: [
      ...spec.multiPointSet.pointSets.map((points) => {
        return {
          showLine: true,
          label: spec.multiPointSet.pointCount + ' points',
          data: points,
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
          text: yAxisLabel,
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
