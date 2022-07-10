<script lang="ts">
  import Pie from 'svelte-chartjs/src/Pie.svelte';
  import type { PerLocationClusterData } from '../lib/cluster_data';

  export let dataByCluster: PerLocationClusterData[];
  export let clusterColors: string[];
</script>

<div class="pie_chart">
  <Pie
    data={{
      labels: dataByCluster.map((_, i) => 'Cluster #' + i),
      datasets: [
        {
          data: dataByCluster.map((data) => data.locationCount),
          backgroundColor: clusterColors,
          hoverOffset: 4
        }
      ]
    }}
    options={{
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: `Caves per Cluster (${dataByCluster.length} clusters)`
        }
      }
    }}
  />
</div>

<style>
  .pie_chart {
    width: 250px;
    margin: 0 auto;
  }
</style>
