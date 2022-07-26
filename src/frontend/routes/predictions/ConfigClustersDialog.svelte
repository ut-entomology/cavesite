<script lang="ts">
  import ModalDialog from '../../common/ModalDialog.svelte';
  import { MAX_ALLOWED_CLUSTERS, TaxonRank, ComparedTaxa } from '../../../shared/model';
  import type { ClusteringConfig } from '../../../frontend-core/clusters/clustering_config';

  const MIN_MIN_POINTS_TO_REGRESS = 3;
  const MAX_MAX_POINTS_TO_REGRESS = 20;

  export let config: ClusteringConfig;
  export let close: () => void;
  export let submit: (config: ClusteringConfig) => void;

  let maxClusters = config.maxClusters;
  let comparedTaxa = config.comparedTaxa;
  let ignoreSubgenera = config.ignoreSubgenera;
  let highestComparedRank = config.highestComparedRank;
  let maxPointsToRegress = config.maxPointsToRegress || Infinity;

  let allowedPointsToRegress: number[] = [];
  for (let i = MIN_MIN_POINTS_TO_REGRESS; i <= MAX_MAX_POINTS_TO_REGRESS; ++i) {
    allowedPointsToRegress.push(i);
  }

  function onSubmit() {
    submit(
      Object.assign({}, config, {
        maxClusters,
        comparedTaxa,
        ignoreSubgenera,
        highestComparedRank,
        maxPointsToRegress
      })
    );
  }
</script>

<ModalDialog title="Configure Cave Clusters" contentClasses="config-effort-content">
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
        <select bind:value={maxClusters} class="form-select form-select-sm item_select">
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
        >
          <option value={ComparedTaxa.all}>All taxa</option>
          <option value={ComparedTaxa.generaHavingCaveObligates}
            >Genera of cave obligates</option
          >
          <option value={ComparedTaxa.caveObligates}>Only cave obligates</option>
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
        >
          <option value={true}>Yes, ignore</option>
          <option value={false}>No, don't ignore</option>
        </select>
      </div>
    </div>
    <div class="row mt-3 mb-2 gx-2 align-items-center">
      <div class="col-sm-7">
        <div><b>Highest taxonomic rank</b> to use in comparisons</div>
      </div>
      <div class="col-sm-5 align-middle">
        <select
          bind:value={highestComparedRank}
          class="form-select form-select-sm item_select"
        >
          <option value={TaxonRank.Kingdom}>Kingdom</option>
          <option value={TaxonRank.Phylum}>Phylum</option>
          <option value={TaxonRank.Class}>Class</option>
          <option value={TaxonRank.Order}>Order</option>
          <option value={TaxonRank.Family}>Family</option>
          <option value={TaxonRank.Genus}>Genus</option>
          <option value={TaxonRank.Species}>Species</option>
        </select>
      </div>
    </div>
    <div class="row mt-3 mb-2 gx-2 align-items-center">
      <div class="col-sm-7">
        <div>
          <b>Max. recent points</b> to regress for modeling species encounter rates
        </div>
      </div>
      <div class="col-sm-2">
        <select
          bind:value={maxPointsToRegress}
          class="form-select form-select-sm item_select"
        >
          {#each allowedPointsToRegress as maxPoints}
            <option value={maxPoints}>{maxPoints}</option>
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
  @import '../../variables.scss';

  .fields .row div div:first-child {
    margin-left: 1rem;
    text-indent: -1rem;
  }

  .dialog_controls button {
    width: 6rem;
    margin: 1rem 0.5rem 0 0.5rem;
  }
</style>
