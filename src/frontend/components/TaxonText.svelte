<script lang="ts">
  import { ModelSpec, TaxonRank, TaxonSpec, italicRanks } from '../../shared/model';

  let classes = '';
  export { classes as class };
  export let spec: ModelSpec;
  export let clickable = false;
  export let onClick: (() => Promise<void>) | null = null;

  // Make it easy to use this component in a generic component.
  let taxonSpec = spec as TaxonSpec;

  const italic = italicRanks.includes(taxonSpec.rank);
</script>

<span class={classes}>
  {#if ![TaxonRank.Species, TaxonRank.Subspecies].includes(taxonSpec.rank)}
    <span class="taxon-rank">{taxonSpec.rank}:</span>
  {/if}
  {#if clickable}
    <span class="taxon-name clickable" class:italic on:click={onClick}
      >{taxonSpec.name}</span
    >
  {:else}
    <span class="taxon-name" class:italic>{taxonSpec.unique}</span>
  {/if}
  {#if taxonSpec.author}
    <span class="taxon-author">{taxonSpec.author}</span>
  {/if}
</span>

<style lang="scss">
  @import '../variables.scss';

  .italic {
    font-style: italic;
  }

  .clickable {
    color: $blueLinkForeColor;
    text-decoration: underline;
  }
  .clickable:hover {
    cursor: pointer;
  }
</style>
