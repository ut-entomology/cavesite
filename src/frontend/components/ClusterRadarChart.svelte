<script lang="ts">
  import Radar from 'svelte-chartjs/src/Radar.svelte';
  import type { PerLocationClusterData } from '../lib/cluster_data';
  import { hslStringToRGBA } from '../lib/graphics';

  export let dataByCluster: PerLocationClusterData[];
  export let clusterColors: string[];

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

  // Rotate the clusters clockwise by one cluster so the shaded areas
  // don't overcrowd the scale.
  const lastDataset = percentCommonByClusterByCluster.pop()!;
  percentCommonByClusterByCluster.unshift(lastDataset);
  for (const dataset of percentCommonByClusterByCluster) {
    const lastValue = dataset.pop()!;
    dataset.unshift(lastValue);
  }

  function _toClusterNo(datasetIndex: number): string {
    return `#${datasetIndex == 0 ? dataByCluster.length : datasetIndex}`;
  }
</script>

<Radar
  data={{
    labels: dataByCluster.map((_, i) => 'Cluster ' + _toClusterNo(i)),
    datasets: [
      ...percentCommonByClusterByCluster.map((percentCommonByCluster, i) => {
        return {
          label: `% taxa common with ${_toClusterNo(i)}`, // labels the point
          data: percentCommonByCluster,
          borderColor: clusterColors[i],
          backgroundColor: hslStringToRGBA(clusterColors[i], 0.2),
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
