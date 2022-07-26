<script lang="ts">
  import SelectableLookup from '../../components/SelectableLookup.svelte';
  import { client } from '../../stores/client';
  import {
    type ModelSpec,
    ROOT_LOCATION_UNIQUE,
    type LocationSpec,
    LocationRank,
    LocationRankIndex,
    locationRanks,
    createContainingLocationSpecs
  } from '../../../shared/model';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection
  } from '../../../frontend-core/selections/selections_tree';
  import type { LocationSelectionsTree } from '../../../frontend-core/selections/location_selections_tree';
  import { noTypeCheck } from '../../util/svelte_types';

  const rootUniqueComponent = ROOT_LOCATION_UNIQUE.split('|').pop()!;

  export let selectionsTree: LocationSelectionsTree;
  export let getContainingLocations: (
    ofLocationSpec: LocationSpec,
    includesGivenLocation: boolean
  ) => Promise<SpecNode<LocationSpec>[]>;
  export let addSelection: AddSelection<LocationSpec>;
  export let removeSelection: RemoveSelection<LocationSpec>;
  export let openUnique: (selectedUnique: string) => Promise<void>;
  export let setClearer: (clearer: () => void) => void;

  function checkNameEquivalence(spec: ModelSpec, name: string): boolean {
    const locationSpec = spec as LocationSpec;
    return locationSpec.name.toLowerCase() == name.toLowerCase();
  }

  function createMatchedItem(spec: ModelSpec) {
    const locationSpec = spec as LocationSpec;
    return { unique: locationSpec.unique, name: locationSpec.name, spec };
  }

  async function loadMatches(partialName: string): Promise<LocationSpec[]> {
    let res = await $client.post('api/location/match_name', { partialName });
    const matchedSpecs: LocationSpec[] = res.data.locationSpecs;
    for (let i = 0; i < matchedSpecs.length; ++i) {
      const spec = matchedSpecs[i];
      if (
        spec.unique == ROOT_LOCATION_UNIQUE ||
        !spec.unique.includes(rootUniqueComponent)
      ) {
        matchedSpecs.splice(i, 1);
        --i; // repeat this index for shortened array
      }
    }
    return matchedSpecs;
  }

  async function loadSpecIndicatingChildren(
    locationUnique: string
  ): Promise<LocationSpec | null> {
    let res = await $client.post('api/location/pull_list', {
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
      const containingLocations = spec.parentNamePath
        .split('|')
        .slice(LocationRankIndex.County, rankIndex);
      return `${html} <span>(${containingLocations.join(' ')})</span>`;
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
  {createMatchedItem}
  toItemHtml={noTypeCheck(toItemHtml)}
  {checkNameEquivalence}
  {addSelection}
  {removeSelection}
  {openUnique}
  {setClearer}
/>
