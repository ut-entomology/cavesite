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

  let typedTaxon: string;
  let matchedSpecs: TaxonSpec[] | null = null;
  let specsByUnique: Record<string, TaxonSpec> = {};

  function handleChange() {
    const partialName = typedTaxon.trim();
    if (partialName.length < 2) {
      matchedSpecs = null;
    } else {
      _loadMatches(partialName);
    }
  }

  function _highlightMatches(name: string): string {
    const partialTaxon = typedTaxon.trim();
    const matches = name.matchAll(RegExp(escapeRegex(partialTaxon)));
    return ''; // TODO
  }

  async function _loadMatches(partialName: string): Promise<void> {
    let res = await $client.post('api/taxa/match_name', { partialName });
    matchedSpecs = res.data.taxonSpecs;
    if (matchedSpecs!.length == 0) {
      matchedSpecs = null;
    } else {
      specsByUnique = {};
      matchedSpecs!.forEach((spec) => (specsByUnique[spec.unique] = spec));
    }
  }
</script>

<div class="row justify-content-center">
  <div class="col">TBD</div>
  <div class="col">
    <input
      class="form-control"
      type="text"
      bind:value={typedTaxon}
      on:change={handleChange}
      placeholder="Type a taxon to look up"
    />
    {#if matchedSpecs}
      <select class="form-select" size="3" aria-label="size 3 select example">
        {#each matchedSpecs as spec}
          <option value={spec.unique}>{_highlightMatches(spec.unique)}</option>
        {/each}
      </select>
    {/if}
  </div>
  <div class="col"><div class="loupeIcon">{@html loupeIcon}</div></div>
</div>

<style lang="scss">
  .loupeIcon {
    margin-top: -0.1rem;
    width: 1.5rem;
    height: 1.5rem;
  }
</style>
