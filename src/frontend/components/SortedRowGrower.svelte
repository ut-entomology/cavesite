<script lang="ts" context="module">
  // This component takes an items and a getItems. The distinction is imperfect, as
  // items are mainly used to detect whether the items have changed. Attempts to
  // dyanimcally update items upon calls to getItems have to be careful not to cause
  // an infinite loop of reactive updating.

  // the boolean return value indicates whether there are more items
  export type RowItemGetter = (
    count: number,
    increasing: boolean
  ) => Promise<[any[], boolean]>;
</script>

<script lang="ts">
  export let title: string;
  export let itemsClasses = '';
  export let minRows: number;
  export let rowIncrement: number;
  export let increasing: boolean;
  export let sortOptions = ['Increasing', 'Decreasing'];
  export let getItems: RowItemGetter;
  // items is a dependency so updates when available items changes
  export let items: any[];

  let rowCount = minRows;
  let canGrow: boolean;
  let canShrink: boolean;

  $: if (items.length != rowCount) {
    canGrow = rowCount < items.length;
    items = items.slice(0, rowCount);
    canShrink = items.length > minRows;
  }

  async function _updateItems() {
    [items, canGrow] = await getItems(rowCount, increasing);
    canShrink = items.length > minRows;
  }

  function _showMore() {
    rowCount += rowIncrement;
    _updateItems();
  }

  function _shrink() {
    rowCount = minRows;
    _updateItems();
  }
</script>

{#await _updateItems() then}
  <div class="row gx-2 mb-2">
    <div class="col title">{@html title}</div>
    <div class="col-auto sort_label">
      <label for="sortOrder" class="col-form-label">Sort:</label>
    </div>
    <div class="col-auto">
      <select
        bind:value={increasing}
        on:change={_updateItems}
        class="form-select form-select-sm item_select"
        id="sortOrder"
      >
        <option value={true}>{sortOptions[0]}</option>
        <option value={false}>{sortOptions[1]}</option>
      </select>
    </div>
  </div>

  <div class="grower_items mb-2 {itemsClasses}">
    <div class="row">
      <div class="col small mb-2"><slot name="description" /></div>
    </div>
    <slot name="header" />
    {#each items as item, index (item)}
      <slot {item} {index} {increasing} />
    {/each}
  </div>

  <div class="row ms-4 mb-2 me-3 justify-content-between">
    <div class="col small">
      {#if !canGrow}
        (no more rows)
      {/if}
    </div>
    <div class="col text-end">
      {#if canShrink}
        <button class="btn btn-minor" type="button" on:click={_shrink}>Shrink</button>
      {/if}
      {#if canShrink || canGrow}
        <button
          class="btn {canGrow ? 'btn-major' : 'btn-minor'}"
          type="button"
          disabled={!canGrow}
          on:click={_showMore}>Show More</button
        >
      {/if}
    </div>
  </div>
{/await}

<style>
  .title {
    font-size: 1.15rem;
    font-weight: bold;
  }
  .grower_items {
    margin-left: 0.5rem;
  }
  .sort_label {
    margin-top: -0.15em;
    font-size: 0.95em;
  }
  button {
    margin-left: 1rem;
  }
</style>
