<script lang="ts">
  import Pie from 'svelte-chartjs/src/Pie.svelte';

  import type { ClusterColorSet } from './cluster_color_set';
  import type { ClusterData } from '../../../frontend-core/clusters/cluster_data';

  export let dataByCluster: ClusterData[];
  export let clusterColors: ClusterColorSet[];

  function _toDataLabel(ctx: any) {
    return ctx.dataset.data[ctx.dataIndex] + ' caves';
  }
</script>

<Pie
  data={{
    labels: dataByCluster.map((_, i) => 'Caves in cluster #' + (i + 1)),
    datasets: [
      {
        data: dataByCluster.map((data) => data.locationGraphDataSet.length),
        backgroundColor: clusterColors.map((set) => set.foreground),
        hoverOffset: 4
        // datalabels: {
        //   anchor: 'center',
        //   backgroundColor: null,
        //   borderWidth: 0
        // }
      }
    ]
  }}
  options={{
    responsive: true,
    layout: {
      padding: {
        bottom: 10
      }
    },
    plugins: {
      legend: {
        display: false
      },
      labels: {
        display: true,
        render: _toDataLabel
      },
      title: {
        display: true,
        text: `Caves per Cluster (${dataByCluster.length} clusters)`,
        font: { size: 15 },
        position: 'bottom',
        padding: 20
      }
      // datalabels: {
      //   display: _toDataLabel,
      //   color: 'black'
      // }
    },
    animation: {
      duration: 0
    }
  }}
/>
