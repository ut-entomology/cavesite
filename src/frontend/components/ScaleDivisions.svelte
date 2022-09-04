<script lang="ts">
  export let scaleDivisions: string[];
  export let scaleColors: string[];
</script>

<div class="color_scale">
  {#if scaleDivisions.length > 0}
    {#each scaleDivisions as scaleDivision, i}
      <div
        style="width: calc({100 /
          scaleDivisions.length}% - 1px); background-color: {scaleColors[i]}"
        data-text={scaleDivision}
      />
    {/each}
  {:else}
    <div style="width: 100%; background-color: #ddd" data-text="no results" />
  {/if}
</div>

<style>
  .color_scale {
    width: 100%;
    height: 1.5rem;
  }
  .color_scale div {
    position: relative;
    display: inline-block;
    height: 100%;
    margin-left: 1px;
  }
  .color_scale div:before {
    content: attr(data-text);
    position: absolute;
    transform: translateX(-50%);
    left: 50%;
    bottom: 100%;
    width: 8rem;
    margin-bottom: 4px;
    text-align: center;
    display: none;
    font-size: 0.75rem;
  }
  .color_scale div:after {
    content: '';
    position: absolute;
    transform: translateX(-50%);
    left: 50%;
    bottom: 100%;
    margin-bottom: -4px;
    border: 5px solid #000;
    border-color: black transparent transparent transparent;
    display: none;
  }
  .color_scale div:hover:before,
  .color_scale div:hover:after {
    display: block;
    z-index: 100;
  }
</style>
