<script lang="ts" context="module">
  export interface BarSplitSpec {
    percent: number;
    barColor: string;
    backgroundColor: string;
  }
</script>

<script lang="ts">
  export let leftSplitSpec: BarSplitSpec | null = null;
  export let rightSplitSpec: BarSplitSpec | null;
</script>

<div class="row gx-2">
  {#if leftSplitSpec !== null}
    {@const leftPercent = leftSplitSpec.percent}
    <div class="col-3 left_split text-center">
      <div class="full_bar" style="backgroundColor: {leftSplitSpec.barColor}">
        {#if leftPercent > 0}
          <div
            class="value_bar"
            style="width: {leftPercent}%; backgroundColor: {leftSplitSpec.backgroundColor}"
          />
        {/if}
      </div>
      <slot name="left" />
    </div>
  {/if}
  {#if rightSplitSpec !== null}
    {@const rightPercent = rightSplitSpec.percent}
    <div class="col right_split">
      <div class="full_bar" style="backgroundColor: {rightSplitSpec.barColor}">
        {#if rightPercent > 0}
          <div
            class="value_bar"
            style="width: {rightPercent}%; backgroundColor: {rightSplitSpec.backgroundColor}"
          />
        {/if}
      </div>
      <slot name="right" />
    </div>
  {/if}
</div>

<style>
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
</style>
