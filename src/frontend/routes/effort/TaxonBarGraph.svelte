<script lang="ts">
  import SortedRowGrower from './SortedRowGrower.svelte';
  import SplitHorizontalBar, { type BarSplitSpec } from './SplitHorizontalBar.svelte';
  import { type TaxonSpec, TaxonRank, TaxonRankIndex } from '../../../shared/model';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import { client } from '../../stores/client';

  const MIN_ROWS = 10;
  const ROW_INCREMENT = 40;
  const kingdomPhylumClass = [TaxonRank.Kingdom, TaxonRank.Phylum, TaxonRank.Class];
  const genusSpeciesSubspecies = [
    TaxonRank.Genus,
    TaxonRank.Species,
    TaxonRank.Subspecies
  ];

  interface TaxonItem {
    unique: string;
    visits: number;
    rank?: TaxonRank;
    path?: string;
  }

  export let title: string;
  export let visitsByTaxonUnique: Record<string, number>;
  export let locationGraphDataSet: LocationGraphData[];

  let items: TaxonItem[];
  let totalVisits: number;

  $: {
    items = Object.entries(visitsByTaxonUnique).map((entry) => {
      return { unique: entry[0], visits: entry[1] };
    }) as TaxonItem[];
    totalVisits = 0;
    for (const graphData of locationGraphDataSet) {
      totalVisits += graphData.perVisitPoints.length;
    }
  }

  $: titleSuffix = ` <span class="taxon_count">(${items.length} ${
    items.length == 1 ? 'taxon' : 'taxa'
  })</span>`;

  async function getItems(
    count: number,
    increasing: boolean
  ): Promise<[any[], boolean]> {
    items.sort((a, b) => {
      if (a.visits == b.visits) return 0;
      return b.visits - a.visits;
    });
    if (increasing) items.reverse();

    const subset = items.slice(0, count);
    await _populateItems(subset);
    return [subset, items.length > count];
  }

  async function _populateItems(subset: TaxonItem[]): Promise<void> {
    // Identify the taxon uniques for which we lack information and
    // load the taxon specs for just these taxa.

    const neededUniques: string[] = [];
    const uniqueToItemMap: Record<string, TaxonItem> = {};
    for (const item of subset) {
      if (item.rank === undefined) {
        neededUniques.push(item.unique);
        uniqueToItemMap[item.unique] = item;
      }
    }
    const res = await $client.post('api/taxa/get_list', {
      taxonUniques: neededUniques
    });
    const specs: TaxonSpec[] = res.data.taxonSpecs;

    // Populate the deficient items with the loaded taxon specs.

    for (const spec of specs) {
      const item = uniqueToItemMap[spec.unique];
      item.rank = spec.rank;
      if (!kingdomPhylumClass.includes(item.rank)) {
        item.path = spec.parentNamePath
          .split('|')
          .slice(TaxonRankIndex.Class, TaxonRankIndex.Genus)
          .join(' ');
      }
    }
  }

  function _toRightSplitSpec(item: TaxonItem): BarSplitSpec {
    return {
      percent: (100 * item.visits) / totalVisits,
      barColor: '#d1c0fe',
      backgroundColor: '#ddd'
    };
  }
</script>

{#key items}
  <SortedRowGrower
    title={title + titleSuffix}
    itemsClasses="taxon_bar_graph"
    minRows={MIN_ROWS}
    rowIncrement={ROW_INCREMENT}
    increasing={false}
    {getItems}
    {items}
    let:item
  >
    <SplitHorizontalBar classes="bar_spacer" rightSplitSpec={_toRightSplitSpec(item)}>
      <div slot="right">
        <div class="row gx-1">
          <div class="col-2 text-center">{item.visits}</div>
          <div class="col-1 text-end taxon_deemph">{item.rank}:</div>
          <div class="col">
            {#if genusSpeciesSubspecies.includes(item.rank)}
              <i>{item.unique}</i>
            {:else}
              {item.unique}
            {/if}
            {#if !kingdomPhylumClass.includes(item.rank)}
              <span class="taxon_deemph">({item.path})</span>
            {/if}
          </div>
        </div>
      </div>
    </SplitHorizontalBar>
  </SortedRowGrower>
{/key}

<style lang="scss">
  :globel(.taxon_bar_graph) {
    margin-top: 1rem;
    font-size: 0.95rem;
  }
  :global(.taxon_count) {
    font-size: 0.95em;
    color: #888;
  }
  :global(.bar_spacer) {
    margin-bottom: 2px;
  }
  :global(.taxon_deemph) {
    color: #6a547f;
    font-size: 0.95em;
  }
</style>
