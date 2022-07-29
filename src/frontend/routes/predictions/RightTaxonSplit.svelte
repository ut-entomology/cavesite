<script lang="ts" context="module">
  import { kingdomPhylumClass, genusSpeciesSubspecies } from '../../../shared/model';
  export interface TaxonItem {
    unique: string;
    visits: number;
    rank?: TaxonRank;
    path?: string;
  }

  function toRank(item: TaxonItem): TaxonRank {
    // get around lack of TypeScript support in HTML portion
    return item.rank!;
  }
</script>

<script lang="ts">
  import { TaxonRank } from '../../../shared/model';

  export let item: TaxonItem;
  export let isPrediction: boolean;
</script>

<div class="row gx-3">
  <div class="col-2 {isPrediction ? 'text-end' : 'text-center'}">
    {item.visits} <span class="stats_deemph">visits</span>
  </div>
  <div class="col-1 text-end stats_deemph">
    {item.rank == TaxonRank.Subspecies ? 'subsp.' : item.rank}:
  </div>
  <div class="col ms-2">
    {#if genusSpeciesSubspecies.includes(toRank(item))}
      <i>{item.unique}</i>
    {:else}
      {item.unique}
    {/if}
    {#if !kingdomPhylumClass.includes(toRank(item))}
      <span class="stats_deemph">({item.path})</span>
    {/if}
  </div>
</div>
