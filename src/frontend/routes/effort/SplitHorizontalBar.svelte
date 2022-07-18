<script lang="ts" context="module">
  export interface BarSplitSpec {
    percent: number;
    barColor: string;
    backgroundColor: string;
  }
</script>

<script lang="ts">
  export let classes = '';
  export let leftSplitSpec: BarSplitSpec | null = null;
  export let rightSplitSpec: BarSplitSpec | null;
</script>

<div class="row gx-1 {classes}">
  {#if leftSplitSpec !== null}
    {@const leftPercent = leftSplitSpec.percent}
    <div
      class="col-3 gx-0 left_split text-center"
      style="background-color: {leftSplitSpec.backgroundColor}"
    >
      <div class="full_bar">
        <slot name="left" />
      </div>
      {#if leftPercent > 0}
        <div
          class="value_bar"
          style="width: {leftPercent}%; background-color: {leftSplitSpec.barColor}"
        >
          &nbsp;
        </div>
      {:else}
        <div class="value_bar">&nbsp;</div>
      {/if}
    </div>
  {/if}
  {#if rightSplitSpec !== null}
    {@const rightPercent = rightSplitSpec.percent}
    <div class="col right_split">
      <div style="background-color: {rightSplitSpec.backgroundColor}">
        <div class="full_bar">
          <slot name="right" />
        </div>
        {#if rightPercent > 0}
          <div
            class="value_bar"
            style="width: {rightPercent}%; background-color: {rightSplitSpec.barColor}"
          >
            &nbsp;
          </div>
        {:else}
          <div class="value_bar">&nbsp;</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .left_split,
  .right_split {
    position: relative;
  }

  .full_bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .value_bar {
    height: 100%;
  }
  .left_split .value_bar {
    float: right;
  }
</style>
