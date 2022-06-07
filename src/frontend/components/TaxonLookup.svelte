<script lang="ts">
  import { client } from '../stores/client';
  import type { TaxonSpec } from '../../shared/model';
  import { escapeRegex } from '../util/regex';

  const loupeIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
<g><path d="M497.938,430.063l-126.914-126.91C389.287,272.988,400,237.762,400,200C400,89.719,310.281,0,200,0
		C89.719,0,0,89.719,0,200c0,110.281,89.719,200,200,200c37.762,0,72.984-10.711,103.148-28.973l126.914,126.91
		C439.438,507.313,451.719,512,464,512c12.281,0,24.563-4.688,33.938-14.063C516.688,479.195,516.688,448.805,497.938,430.063z
		M64,200c0-74.992,61.016-136,136-136s136,61.008,136,136s-61.016,136-136,136S64,274.992,64,200z"/></g></svg>`;

  export let openTaxon: (taxonID: number) => Promise<void>;

  let typedTaxon: string;
  let taxonSpec: TaxonSpec | null = null;
  let matchedSpecs: TaxonSpec[] | null = null;
  let specsByUnique: Record<string, TaxonSpec> = {};
  let selectedTaxon: string;

  function handleChange() {
    taxonSpec = null;
    const partialName = typedTaxon.trim();
    if (partialName.length < 2) {
      matchedSpecs = null;
    } else {
      _loadMatches(partialName);
    }
  }

  function _toMatchHtml(name: string): string {
    const partialTaxon = typedTaxon.trim();
    let html = '';
    let copiedToOffset = 0;
    const matches = name.matchAll(RegExp(escapeRegex(partialTaxon), 'ig'));
    for (const match of matches) {
      html += `${name.substring(copiedToOffset, match.index)}<span>${match[0]}</span>`;
      copiedToOffset = match.index! + partialTaxon.length;
    }
    if (copiedToOffset < name.length) {
      html += name.substring(copiedToOffset);
    }
    return html;
  }

  async function _loadMatches(partialName: string): Promise<void> {
    let res = await $client.post('api/taxa/match_name', { partialName });
    matchedSpecs = res.data.taxonSpecs;
    if (matchedSpecs!.length == 0) {
      matchedSpecs = null;
    } else {
      specsByUnique = {};
      for (const spec of matchedSpecs!) {
        specsByUnique[spec.unique] = spec;
        if (spec.unique.toLocaleLowerCase() == partialName.toLocaleLowerCase()) {
          _selectTaxon(spec.unique);
        }
      }
    }
  }

  function _openTaxon() {
    openTaxon(taxonSpec!.taxonID);
  }

  function _selectTaxon(unique: string) {
    taxonSpec = specsByUnique[unique];
  }
</script>

<div class="row justify-content-center">
  <div class="col-sm-1">TBD</div>
  <div class="col">
    <input
      class="form-control"
      type="text"
      bind:value={typedTaxon}
      on:change={handleChange}
      placeholder="Type a taxon to look up"
    />
    {#if matchedSpecs}
      <div class="matches">
        <select
          bind:value={selectedTaxon}
          class="form-select"
          size="3"
          aria-label="Matching taxa"
          on:change={() => _selectTaxon(selectedTaxon)}
        >
          {#each matchedSpecs as spec}
            <option value={spec.unique}>{_toMatchHtml(spec.unique)}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>
  <div class="col-sm-1">
    {#if taxonSpec}
      <div class="loupeIcon" on:click={_openTaxon}>
        {@html loupeIcon}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .loupeIcon {
    margin-top: -0.1rem;
    width: 1.5rem;
    height: 1.5rem;
  }
  .matches :global(span) {
    text-decoration: underline;
  }
</style>
