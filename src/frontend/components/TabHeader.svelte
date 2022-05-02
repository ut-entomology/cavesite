<script lang="ts">
  export let title: string;
  export let instructions: string | null = null;
</script>

<div class="row mt-2 mb-2 justify-content-between">
  <div class="col-auto title">
    {@html title}
    <slot name="title-button" />
  </div>
  <div class="col-auto">
    <slot name="main-buttons" />
  </div>
</div>
{#if instructions}
  <div class="row justify-content-center">
    <div class="tab-instructions">{@html instructions}</div>
  </div>
{/if}
{#if $$slots['work-buttons']}
  <div class="row mb-2 justify-content-center">
    <div class="col-auto">
      <slot name="work-buttons" />
    </div>
  </div>
{/if}

<style>
  .title {
    font-weight: bold;
    font-size: 1.2rem;
  }
  .tab-instructions {
    margin-bottom: 1rem;
  }
</style>
