<script lang="ts">
  import SelectableLookup from '../components/SelectableLookup.svelte';
  import { client } from '../stores/client';
  import {
    ROOT_LOCATION,
    type LocationSpec,
    LocationRank,
    LocationRankIndex,
    locationRanks,
    createContainingLocationSpecs
  } from '../../shared/model';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection
  } from '../../frontend-core/selections_tree';
  import type { LocationSelectionsTree } from '../../frontend-core/location_selections_tree';
  import { noTypeCheck } from '../util/svelte_types';

  export let selectionsTree: LocationSelectionsTree;
  export let getContainingLocations: (
    ofLocationSpec: LocationSpec,
    includesGivenLocation: boolean
  ) => Promise<SpecNode<LocationSpec>[]>;
  export let addSelection: AddSelection<LocationSpec>;
  export let removeSelection: RemoveSelection<LocationSpec>;
  export let openUnique: (selectedUnique: string) => Promise<void>;
  export let setClearer: (clearer: () => void) => void;

  async function loadMatches(partialName: string): Promise<LocationSpec[]> {
    let res = await $client.post('api/location/match_name', { partialName });
    const matchedSpecs: LocationSpec[] = res.data.locationSpecs;
    for (let i = 0; i < matchedSpecs.length; ++i) {
      const spec = matchedSpecs[i];
      if (spec.name == ROOT_LOCATION || !spec.parentNamePath.includes(ROOT_LOCATION)) {
        matchedSpecs.splice(i, 1);
        --i; // repeat this index for shortened array
      }
    }
    return matchedSpecs;
  }

  async function loadSpecIndicatingChildren(
    locationUnique: string
  ): Promise<LocationSpec | null> {
    let res = await $client.post('api/location/get_list', {
      locationUniques: [locationUnique]
    });
    const locationSpecs: LocationSpec[] = res.data.locationSpecs;
    return locationSpecs && locationSpecs.length == 1 ? locationSpecs[0] : null;
  }

  function toItemHtml(spec: LocationSpec, label: string): string {
    let html = label;
    let rankIndex = locationRanks.indexOf(spec.rank);
    if (spec.rank == LocationRank.County) {
      return html;
    } else {
      const containingTaxa = spec.parentNamePath
        .split('|')
        .slice(LocationRankIndex.County, rankIndex);
      return `${html} <span>(${containingTaxa.join(' ')})</span>`;
    }
  }
</script>

<SelectableLookup
  typeLabel="location"
  {selectionsTree}
  {loadMatches}
  {loadSpecIndicatingChildren}
  getContainingSpecs={noTypeCheck(getContainingLocations)}
  createContainingSpecs={noTypeCheck(createContainingLocationSpecs)}
  toItemHtml={noTypeCheck(toItemHtml)}
  {addSelection}
  {removeSelection}
  {openUnique}
  {setClearer}
/>
