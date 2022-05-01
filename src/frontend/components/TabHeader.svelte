<script lang="ts">
  export let title: string;
  export let instructions: string;
  export let note: string | null = null;
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
<div class="row justify-content-center">
  <div class="tab-instructions">{@html instructions}</div>
</div>
<div class="row mb-2 justify-content-between">
  <div class="col-auto">
    <slot name="work-buttons" />
  </div>
  {#if note}
    <div class="col-auto included_note">({@html note})</div>
  {/if}
</div>

<style>
  .title {
    font-weight: bold;
  }
  .tab-instructions {
    margin-bottom: 1rem;
  }
  .included_note {
    padding: 0.4em 1.5em 0 0;
    font-size: 0.9em;
  }
</style>
