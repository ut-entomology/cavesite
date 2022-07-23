<script lang="ts">
  export let leftHeader: string | null = null;
  export let rightHeader: string;
</script>

<div class="row gx-1">
  {#if leftHeader}
    <div class="col-3 text-center header">{leftHeader}</div>
  {/if}
  <div class="col">
    <div class="header text-center">{rightHeader}</div>
  </div>
</div>

<style>
  .header {
    background-color: #c4c4c4;
    margin-bottom: 2px;
    font-size: 0.95em;
  }
</style>
