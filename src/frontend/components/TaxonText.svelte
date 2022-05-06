<script lang="ts">
  import { TaxonRank, TaxonSpec } from '../../shared/taxa';

  let classes = '';
  export { classes as class };
  export let spec: TaxonSpec;
  export let clickable: boolean;
  export let onClick: () => Promise<void>;

  let italic = [TaxonRank.Genus, TaxonRank.Species, TaxonRank.Subspecies].includes(
    spec.rank
  );
</script>

<span class={classes}>
  {#if ![TaxonRank.Species, TaxonRank.Subspecies].includes(spec.rank)}
    <span class="taxon-rank">{spec.rank}:</span>
  {/if}
  {#if clickable}
    <span class="taxon-name clickable" class:italic on:click={onClick}>{spec.name}</span
    >
  {:else}
    <span class="taxon-name" class:italic>{spec.name}</span>
  {/if}
  {#if spec.author}
    <span class="taxon-author">{spec.author}</span>
  {/if}
</span>

<style lang="scss">
  @import '../variables.scss';

  .italic {
    font-style: italic;
  }

  .clickable {
    color: $blueLinkForeColor;
  }
  .clickable:hover {
    cursor: pointer;
  }
</style>
