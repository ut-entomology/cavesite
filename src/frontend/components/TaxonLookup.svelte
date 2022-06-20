<script lang="ts">
  import SelectableLookup from '../components/SelectableLookup.svelte';
  import { client } from '../stores/client';
  import {
    ROOT_TAXON,
    type TaxonSpec,
    TaxonRank,
    taxonRanks,
    italicRanks,
    createContainingTaxonSpecs
  } from '../../shared/model';
  import type {
    SpecEntry,
    AddSelection,
    RemoveSelection
  } from '../../frontend-core/selections_tree';
  import type { TaxonSelectionsTree } from '../../frontend-core/taxon_selections_tree';

  export let selectionsTree: TaxonSelectionsTree;
  export let getContainingTaxa: (
    ofTaxonSpec: TaxonSpec,
    includesGivenTaxon: boolean
  ) => Promise<SpecEntry<TaxonSpec>[]>;
  export let addSelection: AddSelection<TaxonSpec>;
  export let removeSelection: RemoveSelection<TaxonSpec>;
  export let openTaxon: (selection: string) => Promise<void>;
  export let setClearer: (clearer: () => void) => void;

  const noTypeCheck = (x: any) => x;

  async function loadMatches(partialName: string): Promise<TaxonSpec[]> {
    let res = await $client.post('api/taxa/match_name', { partialName });
    const matchedSpecs: TaxonSpec[] = res.data.taxonSpecs;
    const rootSpecIndex = matchedSpecs.findIndex((spec) => spec.unique == ROOT_TAXON);
    if (rootSpecIndex >= 0) {
      matchedSpecs.splice(rootSpecIndex, 1);
    }
    return matchedSpecs;
  }

  async function loadSpecIndicatingChildren(
    taxonUnique: string
  ): Promise<TaxonSpec | null> {
    let res = await $client.post('api/taxa/get_list', {
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
      const containingTaxa = spec.parentNamePath.split('|').slice(2, rankIndex);
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
  toItemHtml={noTypeCheck(toItemHtml)}
  {addSelection}
  {removeSelection}
  openUnique={openTaxon}
  {setClearer}
/>
