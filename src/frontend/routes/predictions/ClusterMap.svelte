<script lang="ts">
  import InfoDialog from '../../dialogs/InfoDialog.svelte';
  import KarstMap, { type MapMarkerSpec } from '../../components/KarstMap.svelte';
  import type { ClusterColorSet } from './cluster_color_set';
  import type { ClusterData } from '../../../frontend-core/clusters/cluster_data';

  export let clusterColors: ClusterColorSet[];
  export let dataByCluster: ClusterData[];
  export let close: () => void;

  let markerSpecs: MapMarkerSpec[] = [];
  let featureColors: string[] = [];

  for (let i = 0; i < dataByCluster.length; ++i) {
    const clusterData = dataByCluster[i];
    for (const graphData of clusterData.locationGraphDataSet) {
      const latitude = graphData.latitude;
      const longitude = graphData.longitude;
      graphData.visitsByTaxonUnique;

      if (latitude && longitude) {
        const visitCount = graphData.perVisitPoints.length;
        const taxonCount = Object.keys(graphData.visitsByTaxonUnique).length;
        let label = graphData.localityName;
        if (graphData.countyName) label += ', ' + graphData.countyName;
        label = `<b>${label}</b> (cluster #${i + 1}, ${visitCount} ${
          visitCount == 1 ? 'visit' : 'visits'
        }, ${taxonCount} ${taxonCount == 1 ? 'taxon' : 'taxa'})`;

        markerSpecs.push({
          label,
          latitude,
          longitude
        });
        featureColors.push(clusterColors[i].foreground);
      }
    }
  }
</script>

<InfoDialog
  title="Map of Clustered Caves"
  classes="map_dialog"
  maxWidth="1200px"
  onClose={close}
>
  <div class="map_area">
    <KarstMap {markerSpecs} baseRGB={[0, 0, 0]} {featureColors} />
  </div>
</InfoDialog>

<style>
  :global(.map_dialog) {
    display: flex;
    position: relative;
    flex-direction: column;
    flex-grow: 1;
    width: 100%;
  }
  .map_area {
    display: flex;
    position: relative;
    flex-direction: column;
    flex-grow: 1;
    width: 100%;
    height: 600px;
  }
</style>
