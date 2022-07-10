<script lang="ts">
  import Radar from 'svelte-chartjs/src/Radar.svelte';
  import type { PerLocationClusterData } from '../lib/cluster_data';
  import { hslStringToRGBA } from '../lib/graphics';

  export let dataByCluster: PerLocationClusterData[];
  export let clusterColors: string[];

  // Rotate the clusters clockwise by one cluster so the shaded areas don't
  // overcrowd the scale, but adjust the cluster numbers everywhere.
  let rotatedDataByCluster = dataByCluster.slice();
  const lastCluster = rotatedDataByCluster.pop()!;
  rotatedDataByCluster.unshift(lastCluster);

  let percentCommonByClusterByCluster: number[][] = [];

  for (const baseClusterData of rotatedDataByCluster) {
    const baseTaxaMap = baseClusterData.visitsByTaxonUnique;
    const percentCommonByCluster: number[] = [];
    for (const comparedClusterData of rotatedDataByCluster) {
      if (comparedClusterData === baseClusterData) {
        // shortcut to save processing time
        percentCommonByCluster.push(100);
      } else {
        const comparedTaxaMap = comparedClusterData.visitsByTaxonUnique;
        let commonCount = 0;
        let totalCount = 0;
        for (const taxon of Object.keys(baseTaxaMap)) {
          if (comparedTaxaMap[taxon]) {
            ++commonCount;
          }
          ++totalCount;
        }
        percentCommonByCluster.push(
          parseFloat(((100 * commonCount) / totalCount).toFixed(1))
        );
      }
    }
    percentCommonByClusterByCluster.push(percentCommonByCluster);
  }

  function _toClusterNo(datasetIndex: number): number {
    return datasetIndex == 0 ? dataByCluster.length : datasetIndex;
  }
</script>

<Radar
  data={{
    labels: dataByCluster.map((_, i) => 'Cluster #' + _toClusterNo(i)),
    datasets: [
      ...percentCommonByClusterByCluster.map((percentCommonByCluster, i) => {
        const colorIndex = i == 0 ? dataByCluster.length - 1 : i - 1;
        return {
          label: `% taxa common with #${_toClusterNo(i)}`, // labels the point
          data: percentCommonByCluster,
          borderColor: clusterColors[colorIndex],
          backgroundColor: hslStringToRGBA(clusterColors[colorIndex], 0.2),
          fill: true
        };
      })
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
        text: `Percent Compared Taxa in Common`
      }
    }
  }}
/>
