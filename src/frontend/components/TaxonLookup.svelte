<script lang="ts">
  import { onMount } from 'svelte';
  import AutoComplete from 'simple-svelte-autocomplete';

  import SelectionButton from '../components/SelectionButton.svelte';
  import CircleIconButton from './CircleIconButton.svelte';
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
  export let openTaxon: (selection: string) => Promise<void>;

  interface MatchedItem {
    unique: string;
    html: string;
  }

  let matchedSpecs: TaxonSpec[] = [];
  let selection: string | undefined;
  let isSelectedInTree = false;
  let taxonSpec: TaxonSpec | null = null;
  let specsByUnique: Record<string, TaxonSpec> = {};
  let autocompleteClearButton: Element;

  $: if (selection) {
    taxonSpec = matchedSpecs.find((spec) => spec.unique == selection)!;
    isSelectedInTree = selectionsTree.isSelected(taxonSpec.unique);
  } else {
    taxonSpec = null;
  }

  onMount(() => {
    const autocompleteInput = document.querySelector(
      'div.auto_taxon input.autocomplete-input'
    )!;
    autocompleteInput.addEventListener('input', _inputChanged);

    autocompleteClearButton = document.querySelector(
      'div.auto_taxon span.autocomplete-clear-button'
    )!;
    autocompleteClearButton.addEventListener('click', _clearedAutocomplete);
    _toggleClearButton(false);
  });

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
          selection = spec.unique;
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
    isSelectedInTree = true;
  }

  async function _removeSelection() {
    const containingSpecs = await getContainingTaxa(taxonSpec!, false);
    removeSelection(containingSpecs, taxonSpec!);
    isSelectedInTree = false;
  }

  function _inputChanged() {
    // @ts-ignore
    const newValue = this.value;
    _toggleClearButton(!!newValue);
    if (newValue.toLowerCase() != selection?.toLowerCase()) {
      selection = undefined;
    }
  }

  function _clearedAutocomplete() {
    selection = undefined;
    _toggleClearButton(false);
  }

  function _toggleClearButton(show: boolean) {
    autocompleteClearButton.setAttribute(
      'style',
      'display:' + (show ? 'block' : 'none')
    );
  }
</script>

<div class="row justify-content-center gx-0">
  <div class="col-sm-1 text-end auto_control">
    {#if taxonSpec}
      <SelectionButton
        selected={isSelectedInTree}
        addSelection={_addSelection}
        removeSelection={_removeSelection}
      />
    {/if}
  </div>
  <div class="col auto_taxon">
    <AutoComplete
      className="outer_auto_complete"
      inputClassName="form-control"
      bind:value={selection}
      searchFunction={_loadMatches}
      delay={LOAD_DELAY_MILLIS}
      valueFieldName="unique"
      labelFieldName="html"
      placeholder="Type a taxon to look up"
      minCharactersToSearch={2}
      hideArrow={true}
      showClear={true}
    />
  </div>
  <div class="col-sm-1 auto_control">
    {#if taxonSpec}
      <CircleIconButton class="loupe_button" label="Open taxon in browser">
        <div class="loupeIcon" on:click={_openTaxon}>
          {@html loupeIcon}
        </div>
      </CircleIconButton>
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
  .loupeIcon {
    margin-top: -0.1rem;
    width: 1rem;
    height: 1rem;
    fill: $blueLinkForeColor;
    cursor: pointer;
  }
  .loupeIcon:hover {
    fill: white;
  }
</style>
