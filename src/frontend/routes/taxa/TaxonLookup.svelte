<script lang="ts">
  import SelectableLookup from '../../components/SelectableLookup.svelte';
  import { client } from '../../stores/client';
  import {
    type ModelSpec,
    ROOT_TAXON_UNIQUE,
    type TaxonSpec,
    TaxonRank,
    TaxonRankIndex,
    taxonRanks,
    italicRanks,
    createContainingTaxonSpecs
  } from '../../../shared/model';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection
  } from '../../../frontend-core/selections/selections_tree';
  import type { TaxonSelectionsTree } from '../../../frontend-core/selections/taxon_selections_tree';
  import { noTypeCheck } from '../../util/svelte_types';

  export let selectionsTree: TaxonSelectionsTree;
  export let getContainingTaxa: (
    ofTaxonSpec: TaxonSpec,
    includesGivenTaxon: boolean
  ) => Promise<SpecNode<TaxonSpec>[]>;
  export let addSelection: AddSelection<TaxonSpec>;
  export let removeSelection: RemoveSelection<TaxonSpec>;
  export let openUnique: (selectedUnique: string) => Promise<void>;
  export let setClearer: (clearer: () => void) => void;

  function checkNameEquivalence(spec: ModelSpec, name: string): boolean {
    const taxonSpec = spec as TaxonSpec;
    return taxonSpec.unique.toLowerCase() == name.toLowerCase();
  }

  function createMatchedItem(spec: ModelSpec) {
    return { unique: spec.unique, name: spec.unique, spec };
  }

  async function loadMatches(partialName: string): Promise<TaxonSpec[]> {
    let res = await $client.post('api/taxa/match_name', { partialName });
    const matchedSpecs: TaxonSpec[] = res.data.taxonSpecs;
    const rootSpecIndex = matchedSpecs.findIndex(
      (spec) => spec.unique == ROOT_TAXON_UNIQUE
    );
    if (rootSpecIndex >= 0) {
      matchedSpecs.splice(rootSpecIndex, 1);
    }
    return matchedSpecs;
  }

  async function loadSpecIndicatingChildren(
    taxonUnique: string
  ): Promise<TaxonSpec | null> {
    let res = await $client.post('api/taxa/pull_list', {
      taxonUniques: [taxonUnique]
    });
    const taxonSpecs: TaxonSpec[] = res.data.taxonSpecs;
    return taxonSpecs && taxonSpecs.length == 1 ? taxonSpecs[0] : null;
  }

  function toItemHtml(spec: TaxonSpec, label: string): string {
    let html = label;
    let rankIndex = taxonRanks.indexOf(spec.rank);
    if (italicRanks.includes(spec.rank)) {
      html = `<i>${label}</i>`;
      rankIndex = taxonRanks.indexOf(TaxonRank.Genus);
    }
    if ([TaxonRank.Phylum, TaxonRank.Class].includes(spec.rank)) {
      return html;
    } else {
      const containingTaxa = spec.parentNamePath
        .split('|')
        .slice(TaxonRankIndex.Class, rankIndex);
      if (containingTaxa.length == 1) {
        return html;
      }
      return `${html} <span>(${containingTaxa.join(' ')})</span>`;
    }
  }
</script>

<SelectableLookup
  typeLabel="taxon"
  {selectionsTree}
  {loadMatches}
  {loadSpecIndicatingChildren}
  getContainingSpecs={noTypeCheck(getContainingTaxa)}
  createContainingSpecs={noTypeCheck(createContainingTaxonSpecs)}
  {createMatchedItem}
  toItemHtml={noTypeCheck(toItemHtml)}
  {checkNameEquivalence}
  {addSelection}
  {removeSelection}
  {openUnique}
  {setClearer}
/>
