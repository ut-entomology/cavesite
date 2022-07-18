<script lang="ts">
  import ModalDialog from '../../common/ModalDialog.svelte';
  import EffortGraph from './EffortGraph.svelte';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import { DatasetType, getGraphSpec } from './dataset_type';
  import type { ClusteringConfig } from '../../../frontend-core/clusters/cluster_data';

  export let config: ClusteringConfig;
  export let locationGraphData: LocationGraphData;
  export let close: () => void;

  let datasetType = DatasetType.personVisits;

  $: titleSuffix = locationGraphData.countyName
    ? ',<br/>' + locationGraphData.countyName
    : '';
  $: graphSpec = getGraphSpec(config, datasetType, false);
</script>

<ModalDialog
  title={locationGraphData.localityName + titleSuffix}
  contentClasses="location-effort-content"
>
  <div class="container-fluid">
    <div class="row">
      <div class="col-auto">
        <div class="btn-group" role="group" aria-label="Switch datasets">
          <input
            type="radio"
            class="btn-check"
            bind:group={datasetType}
            name="dataset"
            id={DatasetType.visits}
            value={DatasetType.visits}
          />
          <label class="btn btn-outline-primary" for={DatasetType.visits}>Visits</label>
          <input
            type="radio"
            class="btn-check"
            bind:group={datasetType}
            name="dataset"
            id={DatasetType.personVisits}
            value={DatasetType.personVisits}
          />
          <label class="btn btn-outline-primary" for={DatasetType.personVisits}
            >Person-Visits</label
          >
        </div>
      </div>
    </div>
    <div class="row mt-3 mb-1">
      <div class="col" style="height: 350px">
        <EffortGraph
          title={graphSpec.graphTitle}
          graphDataSet={[locationGraphData]}
          {graphSpec}
        />
      </div>
    </div>
  </div>

  <div class="row g-2 dialog_controls">
    <div class="col-12 text-center">
      <button class="btn btn-minor" type="button" on:click={close}>Cancel</button>
    </div>
  </div>
</ModalDialog>

<style lang="scss">
  .dialog_controls button {
    width: 6rem;
  }
</style>
