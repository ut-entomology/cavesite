<script lang="ts" context="module">
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';

  export interface MatchedItem {
    unique: string;
    data: LocationGraphData;
  }
</script>

<script lang="ts">
  import ClearerAutoComplete from '../../common/ClearerAutoComplete.svelte';
  import CircleIconButton from '../../components/CircleIconButton.svelte';
  import type { ClusterData } from '../../../frontend-core/clusters/cluster_data';

  const LOAD_DELAY_MILLIS = 333;
  const loupeIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
<g><path d="M497.938,430.063l-126.914-126.91C389.287,272.988,400,237.762,400,200C400,89.719,310.281,0,200,0
		C89.719,0,0,89.719,0,200c0,110.281,89.719,200,200,200c37.762,0,72.984-10.711,103.148-28.973l126.914,126.91
		C439.438,507.313,451.719,512,464,512c12.281,0,24.563-4.688,33.938-14.063C516.688,479.195,516.688,448.805,497.938,430.063z
		M64,200c0-74.992,61.016-136,136-136s136,61.008,136,136s-61.016,136-136,136S64,274.992,64,200z"/></g></svg>`;

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
      placeholder="Enter the name of a cave to see its taxa and predictions"
      minCharactersToSearch={2}
      hideArrow={true}
      cleanUserText={false}
    >
      <div slot="item" let:label let:item>{@html toItemHtml(item.data, label)}</div>
    </ClearerAutoComplete>
  </div>
  <div class="col-sm-1 auto_control">
    {#if foundCave}
      <CircleIconButton class="loupe_button" label="Open cave">
        <div class="loupe_icon" on:click={_openSelectedCave}>
          {@html loupeIcon}
        </div>
      </CircleIconButton>
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
  :global(.loupe_button) {
    margin-left: 0.5rem;
    width: 1.5rem;
    height: 1.5rem;
    padding-left: 0.25rem;
  }
  .loupe_icon {
    margin-top: -0.1rem;
    width: 1rem;
    height: 1rem;
    fill: $blueLinkForeColor;
    cursor: pointer;
  }
  .loupe_icon:hover {
    fill: white;
  }
</style>
