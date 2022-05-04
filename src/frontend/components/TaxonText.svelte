<script lang="ts">
  import { TaxonRank, TaxonSpec } from '../../shared/taxa';

  let classes = '';
  export { classes as class };
  export let spec: TaxonSpec;
</script>

<span class={classes}>
  {#if ![TaxonRank.Species, TaxonRank.Subspecies].includes(spec.rank)}
    <span class="taxon-rank">{spec.rank}:</span>
  {/if}
  {#if [TaxonRank.Genus, TaxonRank.Species, TaxonRank.Subspecies].includes(spec.rank)}
    <i>{spec.name}</i>
  {/if}
  <span class="taxon-name">{spec.name}</span>
  {#if spec.author}
    <span class="taxon-author">{spec.author}</span>
  {/if}
</span>
