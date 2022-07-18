<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import type { Point } from '../../../shared/point';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import {
    type EffortGraphSpec,
    slicePointSet
  } from '../../../frontend-core/clusters/effort_graph_spec';
  import type { PowerFitModel } from '../../../frontend-core/clusters/power_fit_model';

  const POINTS_IN_MODEL_PLOT = 200;

  export let color = '';
  export let graphDataSet: LocationGraphData[];
  export let graphSpec: EffortGraphSpec;
  export let title = graphSpec.graphTitle;
  export let model: PowerFitModel | null = null;
  export let totalCaves = graphDataSet.length;
  export let dataPointColor: string | null = null;
  export let dataPointWidth: number | null = null;

  let pointCount: number;
  let pointSets: Point[][];
  let titleSuffix: string;

  $: xAxisLabel = graphSpec.xAxisLabel;
  $: models = model === null ? [] : [model];

  $: {
    pointCount = 0;
    pointSets = [];
    for (const graphData of graphDataSet) {
      const pointSet = slicePointSet(
        graphSpec.pointExtractor(graphData),
        graphSpec.pointSliceSpec
      );
      if (pointSet !== null) {
        pointSets.push(pointSet);
        pointCount += pointSet.length;
      }
    }

    if (graphDataSet.length == totalCaves) {
      titleSuffix = ` (${totalCaves} caves)`;
    } else {
      titleSuffix = ` (${graphDataSet.length} of ${totalCaves} caves)`;
    }
  }

  function _legendFilter(item: any) {
    return item.datasetIndex == 0 || item.datasetIndex >= pointSets.length;
  }

  function _toDataset(points: Point[]) {
    const config: any = {
      showLine: true,
      label: pointCount + ' points',
      data: points,
      borderWidth: 1,
      hoverBorderWidth: 3,
      hoverBorderColor: '#000000'
    };
    if (dataPointColor !== null) {
      config.borderColor = dataPointColor;
    }
    if (dataPointWidth !== null) {
      config.borderWidth = dataPointWidth;
    }
    return config;
  }
</script>

<Scatter
  data={{
    datasets: [
      ...pointSets.map(_toDataset),
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
          text: 'cumulative species (y)',
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
