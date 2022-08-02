<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import type { Point } from '../../../shared/point';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import {
    type EffortGraphSpec,
    slicePointSet
  } from '../../../frontend-core/clusters/effort_graph_spec';
  import { PowerFitModel } from '../../../frontend-core/clusters/power_fit_model';

  const POINTS_IN_MODEL_PLOT = 30;

  export let graphData: LocationGraphData;
  export let graphSpec: EffortGraphSpec;
  export let title = graphSpec.graphTitle;

  let allPoints: Point[] = [];
  let recentPoints: Point[] = [];
  let modelPoints: Point[] = [];
  let predictedPoint: Point;
  let curveType: string;

  $: xAxisLabel = graphSpec.xAxisLabel;

  $: {
    allPoints = graphSpec.pointExtractor(graphData);
    const points = slicePointSet(allPoints, graphSpec.pointSliceSpec);
    if (points == null || points.length == 1) {
      recentPoints = [];
    } else {
      let fittedY: (x: number) => number;
      if (points.length == 2) {
        const [first, last] = points;
        const m = last.x == first.x ? 0 : (last.y - first.y) / (last.x - first.x);
        const b = last.y - m * last.x;
        fittedY = (x) => m * x + b;
        curveType = 'line';
      } else {
        const model = new PowerFitModel(points);
        fittedY = model.regression.fittedY;
        curveType = 'power curve';
      }

      const firstX = points[0].x;
      const lastX = points[points.length - 1].x + 1;
      modelPoints = [];
      const deltaX = (lastX - firstX) / POINTS_IN_MODEL_PLOT;
      let x = firstX;
      while (x <= lastX + 0.1) {
        const y = fittedY(x);
        // Don't plot model points for y < 0.
        if (y >= 0) modelPoints.push({ x, y });
        x += deltaX;
      }
      recentPoints = points;
      predictedPoint = modelPoints[modelPoints.length - 1];
      predictedPoint.x = Math.round(predictedPoint.x);
    }
  }
</script>

<Scatter
  data={{
    datasets: [
      {
        label: 'predicted point',
        data: [predictedPoint],
        borderWidth: 2,
        backgroundColor: 'red',
        pointRadius: 8
      },
      {
        showLine: true,
        label: 'all ' + allPoints.length + ' points',
        data: allPoints,
        borderWidth: 2,
        borderColor: 'black',
        hoverBorderWidth: 3,
        hoverBorderColor: 'black'
      },
      {
        label: recentPoints.length + ' fitted recent points',
        data: recentPoints,
        backgroundColor: 'rgb(255, 169, 248)',
        borderWidth: 2,
        pointRadius: 8
      },
      {
        showLine: true,
        label: 'fitted ' + curveType,
        data: modelPoints,
        borderWidth: 7,
        borderColor: 'cyan',
        backgroundColor: 'cyan', // fills in label box
        tension: 0.5,
        pointRadius: 0
      }
    ]
  }}
  options={{
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: xAxisLabel,
          font: { size: 16 }
        }
      },
      y: {
        title: {
          display: true,
          text: 'cumulative species',
          font: { size: 16 }
        },
        beginAtZero: true
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
