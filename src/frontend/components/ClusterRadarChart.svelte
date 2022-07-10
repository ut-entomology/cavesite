<script lang="ts">
  import Radar from 'svelte-chartjs/src/Radar.svelte';
  import type { PerLocationClusterData } from '../lib/cluster_data';
  import { hslStringToRGBA } from '../lib/graphics';

  export let dataByCluster: PerLocationClusterData[];
  export let clusterColors: string[];

  // // Rotate the clusters clockwise by one cluster so the shaded areas don't
  // // overcrowd the scale, but adjust the cluster numbers everywhere.
  // let rotatedDataByCluster = dataByCluster.slice();
  // const lastCluster = rotatedDataByCluster.pop()!;
  // rotatedDataByCluster.unshift(lastCluster);

  let percentCommonByClusterByCluster: number[][] = [];

  for (const baseClusterData of dataByCluster) {
    const baseTaxaMap = baseClusterData.visitsByTaxonUnique;
    const percentCommonByCluster: number[] = [];
    for (const comparedClusterData of dataByCluster) {
      if (comparedClusterData === baseClusterData) {
        // shortcut to save processing time
        percentCommonByCluster.push(100);
      } else {
        const comparedTaxaMap = comparedClusterData.visitsByTaxonUnique;
        let commonCount = 0;
        for (const taxon of Object.keys(baseTaxaMap)) {
          if (comparedTaxaMap[taxon]) {
            ++commonCount;
          }
        }
        percentCommonByCluster.push(
          parseFloat(
            ((100 * commonCount) / Object.keys(comparedTaxaMap).length).toFixed(1)
          )
        );
      }
    }
    percentCommonByClusterByCluster.push(percentCommonByCluster);
  }

  function _toClusterNo(datasetIndex: number): number {
    return datasetIndex + 1;
    //return datasetIndex == 0 ? dataByCluster.length : datasetIndex;
  }
</script>

<Radar
  data={{
    labels: dataByCluster.map(
      (_, i) =>
        (i == 0 ? `Cluster ` : '') +
        `#${_toClusterNo(i)}  (${
          Object.keys(dataByCluster[_toClusterNo(i) - 1].visitsByTaxonUnique).length
        } taxa)`
    ),
    datasets: [
      ...percentCommonByClusterByCluster.map((percentCommonByCluster, i) => {
        const colorIndex = _toClusterNo(i) - 1;
        return {
          label: `% of these taxa also in #${_toClusterNo(i)}`, // labels the point
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
        text: `Percent Taxa Common between Clusters`,
        font: { size: 15 },
        position: 'bottom',
        padding: { top: -30 }
      }
    },
    scales: {
      r: {
        pointLabels: {
          font: {
            size: 12
          }
        }
      }
    }
  }}
/>
