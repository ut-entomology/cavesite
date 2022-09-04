<script lang="ts">
  import InfoDialog from '../../dialogs/InfoDialog.svelte';
  import KarstMap, { type MapMarkerSpec } from '../../components/KarstMap.svelte';
  import type { ClusterColorSet } from './cluster_color_set';
  import type { ClusterData } from '../../../frontend-core/clusters/cluster_data';

  export let clusterColors: ClusterColorSet[];
  export let dataByCluster: ClusterData[];
  export let close: () => void;

  const MAX_TOGGLES_PER_ROW = 20;

  interface ClusterToggle {
    clusterNumber: number;
    color: string;
  }

  let clusterToggles: ClusterToggle[][] = [];
  let selectedClusters: boolean[] = [];
  let markerSpecs: MapMarkerSpec[];
  let featureColors: string[];
  let togglesPerRow: number;
  selectAll();

  $: {
    let toggleRow: ClusterToggle[] = [];
    for (let i = 0; i < clusterColors.length; ++i) {
      if (i % MAX_TOGGLES_PER_ROW == 0) {
        toggleRow = [];
        clusterToggles.push(toggleRow);
      }
      toggleRow.push({ clusterNumber: i + 1, color: clusterColors[i].foreground });
    }
    togglesPerRow = clusterToggles[0].length;
  }

  $: {
    markerSpecs = [];
    featureColors = [];
    for (let i = 0; i < dataByCluster.length; ++i) {
      if (selectedClusters[i]) {
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
    }
  }

  function selectAll() {
    selectedClusters = clusterColors.map((_) => true);
  }

  function deselectAll() {
    selectedClusters = clusterColors.map((_) => false);
  }

  function toggleCluster(clusterNumber: number) {
    const clusterIndex = clusterNumber - 1;
    selectedClusters[clusterIndex] = !selectedClusters[clusterIndex];
    selectedClusters = selectedClusters; // rerender
  }
</script>

<InfoDialog title="Map of Clustered Caves" classes="map_dialog" maxWidth="1200px">
  <div class="row mb-2 gx-2" style="margin-top: -0.5rem">
    <div class="col">
      <button class="btn btn-minor" type="button" on:click={selectAll}
        >Select All</button
      >
      <button class="btn btn-minor ms-2" type="button" on:click={deselectAll}
        >Deselect All</button
      >
    </div>
    <div class="col-auto text-end">
      <button class="btn btn-major" type="button" on:click={close}>Close</button>
    </div>
  </div>

  <div class="row mb-2">
    <div class="col">
      <div class="toggle_rows">
        {#each clusterToggles as toggleRow}
          {#each toggleRow as toggle}
            <div
              class="toggle"
              class:selected={selectedClusters[toggle.clusterNumber - 1]}
              style="width: calc({100 /
                togglesPerRow}% - 2px); background-color: {toggle.color}"
              data-text="#{toggle.clusterNumber}"
              on:click={() => toggleCluster(toggle.clusterNumber)}
            >
              #{toggle.clusterNumber}
            </div>
          {/each}
        {/each}
      </div>
    </div>
  </div>

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

  .toggle_rows {
    width: 100%;
    text-align: center;
  }
  .toggle_rows .toggle {
    position: relative;
    display: inline-block;
    margin-left: 2px;
    border-top: 3px solid white;
    border-bottom: 3px solid white;
    font-weight: bold;
    color: white;
    text-align: center;
    cursor: pointer;
  }
  .toggle.selected {
    border-bottom: 3px solid blue;
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
