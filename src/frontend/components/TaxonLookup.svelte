<script lang="ts">
  import AutoComplete from 'simple-svelte-autocomplete';

  import SelectionButton from '../components/SelectionButton.svelte';
  import { client } from '../stores/client';
  import type { TaxonSpec } from '../../shared/model';
  import type {
    SpecEntry,
    AddSelection,
    RemoveSelection
  } from '../../frontend-core/selections_tree';
  import type { TaxonSelectionsTree } from '../../frontend-core/taxon_selections_tree';

  const LOAD_DELAY_MILLIS = 200;
  const loupeIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
<g><path d="M497.938,430.063l-126.914-126.91C389.287,272.988,400,237.762,400,200C400,89.719,310.281,0,200,0
		C89.719,0,0,89.719,0,200c0,110.281,89.719,200,200,200c37.762,0,72.984-10.711,103.148-28.973l126.914,126.91
		C439.438,507.313,451.719,512,464,512c12.281,0,24.563-4.688,33.938-14.063C516.688,479.195,516.688,448.805,497.938,430.063z
		M64,200c0-74.992,61.016-136,136-136s136,61.008,136,136s-61.016,136-136,136S64,274.992,64,200z"/></g></svg>`;

  export let selectionsTree: TaxonSelectionsTree;
  export let getContainingTaxa: (
    ofTaxonSpec: TaxonSpec,
    includesGivenTaxon: boolean
  ) => Promise<SpecEntry<TaxonSpec>[]>;
  export let addSelection: AddSelection<TaxonSpec>;
  export let removeSelection: RemoveSelection<TaxonSpec>;
  export let openTaxon: (taxonUnique: string) => Promise<void>;

  interface MatchedItem {
    unique: string;
    html: string;
  }

  let matchedSpecs: TaxonSpec[] = [];
  let selectedTaxonUnique = '';
  let taxonSpec: TaxonSpec | null = null;
  let specsByUnique: Record<string, TaxonSpec> = {};

  $: if (selectedTaxonUnique != '') {
    taxonSpec = matchedSpecs.find((spec) => spec.unique == selectedTaxonUnique) || null;
  }

  // function _toMatchHtml(name: string): string {
  //   const partialTaxon = typedTaxon.trim();
  //   let html = '';
  //   let copiedToOffset = 0;
  //   const matches = name.matchAll(RegExp(escapeRegex(partialTaxon), 'ig'));
  //   for (const match of matches) {
  //     html += `${name.substring(copiedToOffset, match.index)}<span>${match[0]}</span>`;
  //     copiedToOffset = match.index! + partialTaxon.length;
  //   }
  //   if (copiedToOffset < name.length) {
  //     html += name.substring(copiedToOffset);
  //   }
  //   return html;
  // }

  async function _loadMatches(partialName: string): Promise<MatchedItem[]> {
    let res = await $client.post('api/taxa/match_name', { partialName });
    matchedSpecs = res.data.taxonSpecs;
    if (matchedSpecs!.length == 0) {
      return [];
    } else {
      specsByUnique = {};
      for (const spec of matchedSpecs!) {
        specsByUnique[spec.unique] = spec;
        if (spec.unique.toLocaleLowerCase() == partialName.toLocaleLowerCase()) {
          selectedTaxonUnique = spec.unique;
        }
      }
    }
    return matchedSpecs.map((spec) => {
      return { unique: spec.unique, html: spec.unique };
    });
  }

  function _openTaxon() {
    openTaxon(taxonSpec!.unique);
  }

  function _addSelection() {
    // in its own function be able to use '!'
    addSelection(taxonSpec!);
  }

  async function _removeSelection() {
    const containingSpecs = await getContainingTaxa(taxonSpec!, false);
    removeSelection(containingSpecs, taxonSpec!);
  }
</script>

<div class="row justify-content-center gx-0">
  <div class="col-sm-1 text-end auto_control">
    {#if taxonSpec}
      <SelectionButton
        selected={selectionsTree.isSelected(taxonSpec.unique)}
        addSelection={_addSelection}
        removeSelection={_removeSelection}
      />
    {/if}
  </div>
  <div class="col auto_taxon">
    <AutoComplete
      className="outer_auto_complete"
      inputClassName="form-control"
      bind:value={selectedTaxonUnique}
      searchFunction={_loadMatches}
      delay={LOAD_DELAY_MILLIS}
      valueFieldName="unique"
      labelFieldName="html"
      placeholder="Type a taxon to look up"
      minCharactersToSearch={2}
      hideArrow={true}
    />
  </div>
  <div class="col-sm-1 auto_control">
    {#if taxonSpec}
      <div class="loupeIcon" on:click={_openTaxon}>
        {@html loupeIcon}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  @import '../variables.scss';

  .auto_taxon {
    min-width: 20rem;
  }
  :global(.outer_auto_complete) {
    width: 100%;
  }
  .auto_control {
    margin-top: 0.05rem;
  }
  .loupeIcon {
    margin-left: 0.75rem;
    width: 1rem;
    height: 1rem;
    fill: $blueLinkForeColor;
    cursor: pointer;
  }
</style>
