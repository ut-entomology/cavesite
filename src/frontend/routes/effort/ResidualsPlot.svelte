<script lang="ts">
  import Scatter from 'svelte-chartjs/src/Scatter.svelte';

  import type { Point } from '../../../shared/point';
  import type { FittedModel } from './fitted_model';

  export let color: string;
  export let model: FittedModel;

  // Chart.js plugin adapted from
  //  https://nishimura.eti.br/blog/2021/02/07/chartjs-point-with-vertical/

  const ResidualsPlugin = {
    afterDatasetDraw: function (chart: any, params: any) {
      const ctx = chart.ctx;
      const meta = params.meta;
      ctx.save();
      meta.data.forEach((point: Point) => {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(point.x, meta.yScale.getPixelForValue(0));
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      });
      ctx.restore();
    }
  };
</script>

<Scatter
  data={{
    labels: [1, 2, 3, 4, 5, 6, 7],
    datasets: [
      {
        label: 'residuals',
        borderColor: color,
        data: model.regression.residuals,
        fill: false
      }
    ]
  }}
  options={{
    animation: {
      duration: 0
    },
    responsive: true,
    tooltips: {
      enabled: false
    }
  }}
  plugins={[ResidualsPlugin]}
/>
