<script lang="ts">
  import Radar from 'svelte-chartjs/src/Radar.svelte';

  import type { ClusterColorSet } from './cluster_color_set';
  import type { ClusterData } from '../../../frontend-core/clusters/cluster_data';

  export let dataByCluster: ClusterData[];
  export let clusterColors: ClusterColorSet[];

  // // Rotate the clusters clockwise by one cluster so the shaded areas don't
  // // overcrowd the scale, but adjust the cluster numbers everywhere.
  // let rotatedDataByCluster = dataByCluster.slice();
  // const lastCluster = rotatedDataByCluster.pop()!;
  // rotatedDataByCluster.unshift(lastCluster);

  let percentCommonByClusterByCluster: number[][] = [];
  let dummyDatasets: number[][] = [];

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

  if (dataByCluster.length < 3) {
    for (let i = 0; i < dataByCluster.length; ++i) {
      for (let j = dataByCluster.length; j < 3; ++j) {
        percentCommonByClusterByCluster[i][j] = 50;
      }
    }
    for (let i = dataByCluster.length; i < 3; ++i) {
      let dummyDataset: number[] = [];
      for (let j = 0; j < 3; ++j) {
        dummyDataset.push(100);
      }
      dummyDatasets.push(dummyDataset);
    }
    console.log(
      '**** percentCommonByClusterByCluster',
      percentCommonByClusterByCluster
    );
    console.log('**** dummyDatasets', dummyDatasets);
  }

  function _toClusterNo(datasetIndex: number): number {
    return datasetIndex + 1;
    //return datasetIndex == 0 ? dataByCluster.length : datasetIndex;
  }
</script>

<Radar
  data={{
    labels: [
      ...dataByCluster.map(
        (_, i) =>
          (i == 0 ? `Cluster ` : '') +
          `#${_toClusterNo(i)}  (${
            Object.keys(dataByCluster[_toClusterNo(i) - 1].visitsByTaxonUnique).length
          } taxa)`
      ),
      ...dummyDatasets.map(() => '')
    ],
    datasets: [
      ...percentCommonByClusterByCluster.map((percentCommonByCluster, i) => {
        const colorIndex = _toClusterNo(i) - 1;
        return {
          label: `% of these taxa also in #${_toClusterNo(i)}`, // labels the point
          data: percentCommonByCluster,
          borderColor: clusterColors[colorIndex].foreground,
          backgroundColor: clusterColors[colorIndex].lightBackground,
          tension: 0.5,
          fill: true,
          order: dataByCluster.length - i
        };
      }),
      ...dummyDatasets.map((percentCommonByCluster) => {
        return {
          label: ``,
          data: percentCommonByCluster,
          pointRadius: 0,
          borderWidth: 0,
          fill: false
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
        text: `Percent Overlap in Taxa among Clusters`,
        font: { size: 15 },
        position: 'bottom',
        padding: -30
        //padding: { top: dataByCluster.length == 3 ? -90 : -30 }
      }
    },
    scales: {
      r: {
        pointLabels: {
          font: {
            size: 12
          }
        },
        grid: {
          circular: true
        },
        beginAtZero: true
      }
    },
    animation: {
      duration: 0
    }
  }}
/>
