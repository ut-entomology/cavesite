<script lang="ts">
  import ModalDialog from '../common/ModalDialog.svelte';
  import { MAX_ALLOWED_CLUSTERS, ComparedTaxa } from '../../shared/model';
  import type { ClusteringConfig } from '../lib/cluster_data';

  const MAX_MAX_POINTS_TO_REGRESS = 20;

  export let config: ClusteringConfig;
  export let close: () => void;
  export let submit: (config: ClusteringConfig) => void;

  let maxClusters = config.maxClusters;
  let comparedTaxa = config.comparedTaxa;
  let ignoreSubgenera = config.ignoreSubgenera;
  let maxPointsToRegress = config.maxPointsToRegress;

  function onSubmit() {
    submit({
      maxClusters,
      comparedTaxa,
      ignoreSubgenera,
      maxPointsToRegress
    });
  }
</script>

<ModalDialog
  title="Configure Cave Clusters"
  contentClasses="config-effort-content"
  dialogClasses="config-effort-dialog"
>
  <div class="row mb-2">
    <div class="col">
      Specify the criteria for clustering caves by the commonality of their genera and
      for estimating recent rates of adding species to their checklists.
    </div>
  </div>

  <div class="container-fluid fields">
    <div class="row mt-3 mb-2 gx-2 align-items-center">
      <div class="col-sm-7">
        <div><b>Maximum clusters</b> into which to group the caves</div>
      </div>
      <div class="col-sm-2">
        <select
          bind:value={maxClusters}
          class="form-select form-select-sm item_select"
          aria-label=".form-select-sm example"
        >
          {#each { length: MAX_ALLOWED_CLUSTERS } as _, i}
            <option value={i + 1}>{i + 1}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="row mt-3 mb-2 gx-2 align-items-center">
      <div class="col-sm-7">
        <div><b>Taxa to compare</b> when clustering caves by common fauna</div>
      </div>
      <div class="col-sm-5 align-middle">
        <select
          bind:value={comparedTaxa}
          class="form-select form-select-sm item_select"
          aria-label=".form-select-sm example"
        >
          <option value={ComparedTaxa.caveObligates}>Only cave obligates</option>
          <option value={ComparedTaxa.generaHavingCaveObligates}
            >Genera of cave obligates</option
          >
          <option value={ComparedTaxa.all}>All taxa</option>
        </select>
      </div>
    </div>
    <div class="row mt-3 mb-2 gx-2 align-items-center">
      <div class="col-sm-7">
        <div><b>Ignore subgenera</b> when comparing taxa for clustering</div>
      </div>
      <div class="col-sm-4">
        <select
          bind:value={ignoreSubgenera}
          class="form-select form-select-sm item_select"
          aria-label=".form-select-sm example"
        >
          <option value={true}>Yes, ignore</option>
          <option value={false}>No, don't ignore</option>
        </select>
      </div>
    </div>
    <div class="row mt-3 mb-2 gx-2 align-items-center">
      <div class="col-sm-7">
        <div><b>Maximum points to regress</b> for determining discovery rates</div>
      </div>
      <div class="col-sm-2">
        <select
          bind:value={maxPointsToRegress}
          class="form-select form-select-sm item_select"
          aria-label=".form-select-sm example"
        >
          {#each { length: MAX_MAX_POINTS_TO_REGRESS } as _, i}
            <option value={i + 1}>{i + 1}</option>
          {/each}
          <option value={Infinity}>All</option>
        </select>
      </div>
    </div>
  </div>

  <div class="dialog_controls row g-2">
    <div class="col-12 text-center">
      <button class="btn btn-minor" type="button" on:click={close}>Cancel</button>
      <button class="btn btn-major" type="button" on:click={onSubmit}>Submit</button>
    </div>
  </div>
</ModalDialog>

<style lang="scss">
  @import '../variables.scss';

  .fields .row div div:first-child {
    margin-left: 1rem;
    text-indent: -1rem;
  }

  .dialog_controls button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }
</style>
