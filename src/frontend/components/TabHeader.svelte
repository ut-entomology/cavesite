<script lang="ts">
  export let title: string;
  export let instructions: string | null = null;
  export let center = true;
</script>

<div class="row mt-3 mb-3 justify-content-between">
  <div class="col-auto title">
    {@html title}
    <slot name="title-button" />
  </div>
  <div class="col-auto main-buttons">
    <slot name="main-buttons" />
  </div>
</div>
{#if instructions}
  <div class="row justify-content-center">
    <div class="tab-instructions">{@html instructions}</div>
  </div>
{/if}
{#if $$slots['work-buttons']}
  <div class="row mb-2" class:justify-content-center={center}>
    <div class={center ? 'col-auto' : 'col'}>
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
  .main-buttons :global(button) {
    margin-left: 0.4rem;
  }
</style>
