<script lang="ts">
  import SortedRowGrower, {
    type RowItemGetter
  } from '../../components/SortedRowGrower.svelte';
  import StatsHeaderRow from './StatsHeaderRow.svelte';
  import SplitHorizontalBar, { type BarSplitSpec } from './SplitHorizontalBar.svelte';
  import type { PredictionTierStat } from '../../../frontend-core/clusters/prediction_stats';

  const MIN_ROWS = 10;
  const ROW_INCREMENT = 40;

  export let title: string;
  export let itemsClasses = '';
  export let rightHeader: string;
  export let items: any[];
  export let tierStats: PredictionTierStat[] | null = null;
  export let getItems: RowItemGetter;
  export let getItemPercent: (item: any) => number;

  function _isTierStatIndex(index: number, increasing: boolean): boolean {
    return increasing
      ? index >= items.length - tierStats!.length
      : index < tierStats!.length;
  }

  function _toLeftSplitSpec(index: number, increasing: boolean): BarSplitSpec {
    return {
      percent: _isTierStatIndex(index, increasing)
        ? _toStatPercent(index, increasing)
        : 0,
      barColor: '#faf2c7',
      backgroundColor: '#ddd'
    };
  }

  function _toRightSplitSpec(item: any): BarSplitSpec {
    return {
      percent: getItemPercent(item),
      barColor: '#d1c0fe',
      backgroundColor: '#ddd'
    };
  }

  function _toStatPercent(index: number, increasing: boolean): number {
    if (increasing) index = items.length - index - 1;
    return 100 * tierStats![index].fractionCorrect;
  }

  function _toPercentStr(fraction: number): string {
    return fraction.toFixed(1);
  }
</script>

{#key items}
  <SortedRowGrower
    {title}
    itemsClasses="bar_graph {itemsClasses}"
    minRows={MIN_ROWS}
    rowIncrement={ROW_INCREMENT}
    increasing={false}
    {getItems}
    {items}
    let:item
    let:index
    let:increasing
  >
    <slot slot="description" name="description" />
    <div slot="header">
      <StatsHeaderRow
        leftHeader={tierStats ? 'Accuracy of top N rows' : null}
        {rightHeader}
      />
    </div>
    {#if tierStats === null}
      <SplitHorizontalBar classes="outer_bar" rightSplitSpec={_toRightSplitSpec(item)}>
        <slot slot="right" name="single" {item} />
      </SplitHorizontalBar>
    {:else}
      <SplitHorizontalBar
        classes="outer_bar"
        leftSplitSpec={_toLeftSplitSpec(index, increasing)}
        rightSplitSpec={_toRightSplitSpec(item)}
      >
        <div slot="left">
          {#if _isTierStatIndex(index, increasing)}
            <div class="row gx-0">
              <div class="col stats_deemph text-start ms-2">
                Top {increasing ? items.length - index : index + 1}:
              </div>
              <div class="col me-2">
                {_toPercentStr(_toStatPercent(index, increasing))}
                <span class="percent">%</span>
              </div>
            </div>
          {:else}
            <div class="no_stats">no stats</div>
          {/if}
        </div>
        <slot slot="right" name="right" {item} />
      </SplitHorizontalBar>
    {/if}
  </SortedRowGrower>
{/key}

<style lang="scss">
  :globel(.bar_graph) {
    margin-top: 1rem;
    font-size: 0.95rem;
  }
  :global(.outer_bar) {
    margin-bottom: 2px;
  }
  .percent {
    font-size: 0.9em;
  }
  .no_stats {
    background-color: #f2cbcb;
  }
</style>
