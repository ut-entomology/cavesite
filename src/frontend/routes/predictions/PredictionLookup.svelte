<script lang="ts" context="module">
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';

  export interface MatchedItem {
    unique: string;
    data: LocationGraphData;
  }
</script>

<script lang="ts">
  import ClearerAutoComplete from '../../common/ClearerAutoComplete.svelte';
  import LoupeButton from '../../components/LoupeButton.svelte';
  import type { ClusterData } from '../../../frontend-core/clusters/cluster_data';

  const LOAD_DELAY_MILLIS = 333;

  export let dataByCluster: ClusterData[];
  export let openCave: (cave: LocationGraphData) => void;

  let matchedCaves: LocationGraphData[] = [];
  let selection: string | undefined;
  let foundCave = false;

  $: foundCave = selection ? !!_findCave(selection) : false;

  async function _loadMatches(partialName: string): Promise<MatchedItem[]> {
    matchedCaves = [];
    partialName = partialName.toLowerCase();
    for (const clusterData of dataByCluster) {
      for (const cave of clusterData.locationGraphDataSet) {
        if (cave.localityName.toLowerCase().includes(partialName)) {
          matchedCaves.push(cave);
        }
      }
    }

    if (matchedCaves.length == 0) return [];

    // Only show controls if the partialName matches exactly one list item.
    if (matchedCaves.length == 1) {
      selection = _toUniqueName(matchedCaves[0]);
    }

    return matchedCaves
      .map((cave) => {
        return {
          unique: _toUniqueName(cave),
          data: cave
        };
      })
      .sort((a, b) => (a.unique < b.unique ? -1 : 1));
  }

  function _findCave(unique: string): LocationGraphData | null {
    return matchedCaves.find((cave) => _toUniqueName(cave) == unique) || null;
  }

  function _openSelectedCave() {
    openCave(_findCave(selection!)!); // need TS for bang
  }

  function toItemHtml(_cave: LocationGraphData, label: string): string {
    return label;
  }

  function _toUniqueName(cave: LocationGraphData): string {
    let name = cave.localityName;
    if (cave.countyName) name = `${name}, ${cave.countyName}`;
    return name;
  }
</script>

<div class="row justify-content-center gx-0">
  <div class="col-sm-1" />
  <div class="col selectable_autocomplete">
    <ClearerAutoComplete
      className="outer_auto_complete"
      inputClassName="form-control"
      bind:value={selection}
      searchFunction={_loadMatches}
      localFiltering={false}
      delay={LOAD_DELAY_MILLIS}
      valueFieldName="unique"
      labelFieldName="unique"
      placeholder="Type a cave name and click the loupe for predictions"
      minCharactersToSearch={2}
      hideArrow={true}
      cleanUserText={false}
    >
      <div slot="item" let:label let:item>{@html toItemHtml(item.data, label)}</div>
    </ClearerAutoComplete>
  </div>
  <div class="col-sm-1 auto_control">
    {#if foundCave}
      <LoupeButton label="Open cave" on:click={_openSelectedCave} />
    {/if}
  </div>
</div>

<style lang="scss">
  @import '../../variables.scss';

  .selectable_autocomplete :global(.autocomplete-list-item span) {
    font-size: 0.8em;
    color: #999;
  }
  :global(.outer_auto_complete) {
    width: 100%;
  }
  :global(span.autocomplete-clear-button) {
    opacity: 0.6;
  }
  .auto_control {
    margin-top: 0.05rem;
  }
</style>
