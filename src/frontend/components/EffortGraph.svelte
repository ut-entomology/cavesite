<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import type { PlottableModel } from '../lib/plottable_model';
  import type { EffortGraphSpec } from '../lib/effort_graphs';
  import type { SizedEffortGraphSpec } from '../lib/cluster_data';

  const POINTS_IN_MODEL_PLOT = 200;

  export let title: string;
  export let spec: EffortGraphSpec | SizedEffortGraphSpec;
  export let models: PlottableModel[] = [];
  export let yFormula: string | null = null;

  const isSizedSpec = (spec as SizedEffortGraphSpec).graphSpecs !== undefined;
  const xAxisText = isSizedSpec
    ? (spec as SizedEffortGraphSpec).graphSpecs[0].xAxisLabel
    : (spec as EffortGraphSpec).xAxisLabel;
  const yAxisText = isSizedSpec
    ? (spec as SizedEffortGraphSpec).graphSpecs[0].yAxisLabel
    : (spec as EffortGraphSpec).yAxisLabel;

  const pointDatasets: any = [];
  if (isSizedSpec) {
    const sizedSpec = spec as SizedEffortGraphSpec;
    pointDatasets.push(
      ...sizedSpec.graphSpecs.map((graphSpec) => {
        return {
          showLine: true,
          label: sizedSpec.pointCount + ' points',
          data:
            models.length > 0
              ? models[0].convertDataPoints(graphSpec.points)
              : graphSpec.points,
          // borderColor: _toLocationHexColor(i),
          borderWidth: 1,
          hoverBorderWidth: 3,
          hoverBorderColor: '#000000'
        };
      })
    );
  } else {
    const unsizedSpec = spec as EffortGraphSpec;
    pointDatasets.push({
      label: unsizedSpec.points.length + ' points',
      data:
        models.length > 0
          ? models[0].convertDataPoints(unsizedSpec.points)
          : unsizedSpec.points,
      // borderColor: _toLocationHexColor(i),
      borderWidth: 1
    });
  }

  function _legendFilter(item: any) {
    // When using a sized spec, show a legend for the first line and then
    // one for each model; otherwise show all legends.
    return (
      !isSizedSpec ||
      item.datasetIndex == 0 ||
      item.datasetIndex >= (spec as SizedEffortGraphSpec).graphSpecs.length
    );
  }

  // @ts-ignore TypeScript doesn't recognize range of % operator.
  // function _toLocationHexColor(i: number): string {
  //   switch (i % 3) {
  //     case 0:
  //       return 'rgba(255, 0, 0, .3)';
  //     case 1:
  //       return 'rgba(0, 255, 0, .6)';
  //     case 2:
  //       return 'rgba(0, 0, 255, .3)';
  //   }
  // }
</script>

<Scatter
  data={{
    datasets: [
      ...pointDatasets,
      ...models.map((model) => {
        return {
          showLine: true,
          label: model.name,
          data: model.getModelPoints(POINTS_IN_MODEL_PLOT),
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
          text: xAxisText + ' (x)',
          font: { size: 16 }
        }
      },
      y: {
        title: {
          display: true,
          text: yFormula ? yAxisText + ` (${yFormula})` : yAxisText,
          font: { size: 16 }
        }
      }
    },
    hover: {
      mode: isSizedSpec ? 'dataset' : undefined
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
