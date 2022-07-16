<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import type { Point } from '../../../shared/point';
  import type { LocationGraphData } from './location_graph_data';
  import type { EffortGraphSpec } from './effort_graph_spec';
  import type { FittedModel } from './fitted_model';

  const POINTS_IN_MODEL_PLOT = 200;

  export let color: string;
  export let graphDataSet: LocationGraphData[];
  export let graphSpec: EffortGraphSpec;
  export let title = graphSpec.graphTitle;
  export let model: FittedModel | null = null;

  let caveCount: number;
  let pointCount: number;
  let pointSets: Point[][];
  let titleSuffix: string;

  $: xAxisLabel = graphSpec.xAxisLabel;
  $: models = model === null ? [] : [model];

  $: {
    caveCount = 0;
    pointCount = 0;
    pointSets = [];
    for (const graphData of graphDataSet) {
      const pointSet = graphSpec.pointExtractor(graphData);
      if (pointSet.length > 0) {
        ++caveCount;
        pointSets.push(pointSet);
        pointCount += pointSet.length;
      }
    }

    if (caveCount == graphDataSet.length) {
      titleSuffix = ` (${caveCount} caves)`;
    } else {
      titleSuffix = ` (${caveCount} of ${graphDataSet.length} caves)`;
    }
  }

  function _legendFilter(item: any) {
    return item.datasetIndex == 0 || item.datasetIndex >= pointSets.length;
  }
</script>

<Scatter
  data={{
    datasets: [
      ...pointSets.map((points) => {
        return {
          showLine: true,
          label: pointCount + ' points',
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
          label: 'weighted average of models power-fit to each location',
          data: model.getModelPoints(POINTS_IN_MODEL_PLOT),
          backgroundColor: color
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
          text: 'cumulative species',
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
        text: title + titleSuffix,
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
