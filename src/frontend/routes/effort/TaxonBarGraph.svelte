<script lang="ts">
  import SplittableBarGraph from './SplittableBarGraph.svelte';
  import RightTaxonSplit, {
    type TaxonItem,
    kingdomPhylumClass
  } from './RightTaxonSplit.svelte';
  import { type TaxonSpec, TaxonRankIndex } from '../../../shared/model';
  import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';
  import type { PredictionTierStat } from '../../../frontend-core/clusters/prediction_stats';
  import { client } from '../../stores/client';

  export let title: string;
  export let tierStats: PredictionTierStat[] | null = null;
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
  }, ${totalVisits} ${totalVisits == 1 ? 'visit' : 'visits'})</span>`;

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

  function getItemPercent(item: TaxonItem): number {
    return (100 * item.visits) / totalVisits;
  }
</script>

{#key items}
  <SplittableBarGraph
    title={title + titleSuffix}
    rightHeader={title}
    {tierStats}
    {getItems}
    {items}
    {getItemPercent}
  >
    <slot slot="description" />
    <div slot="single" let:item>
      <RightTaxonSplit {item} isPrediction={false} />
    </div>
    <div slot="right" let:item>
      <RightTaxonSplit {item} isPrediction={true} />
    </div>
  </SplittableBarGraph>
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
  :global(.outer_bar) {
    margin-bottom: 2px;
  }
</style>
