<script lang="ts">
  let expanded = false;
</script>

{#if expanded}
  <slot />
  <span class="clickable" on:click={() => (expanded = false)}>(...<u>LESS</u>)</span>
{:else}
  <span class="clickable" on:click={() => (expanded = true)}>(<u>MORE</u>...)</span>
{/if}

<style lang="scss">
  @import '../variables.scss';

  .clickable {
    color: $blueLinkForeColor;
    cursor: pointer;
  }
</style>
