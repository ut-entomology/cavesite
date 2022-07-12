<script lang="ts">
  import type { ModelSpec, LocationSpec } from '../../../shared/model';

  let classes = '';
  export { classes as class };
  export let spec: ModelSpec;
  export let clickable = false;
  export let onClick: (() => Promise<void>) | null = null;

  // Make it easy to use this component in a generic component.
  let locationSpec = spec as LocationSpec;
</script>

<span class={classes}>
  {#if clickable}
    <span class="location-name clickable" on:click={onClick}>{locationSpec.name}</span>
  {:else}
    <span class="location-name">{locationSpec.name}</span>
  {/if}
</span>

<style lang="scss">
  @import '../../variables.scss';
  .clickable {
    color: $blueLinkForeColor;
    text-decoration: underline;
  }
  .clickable:hover {
    cursor: pointer;
  }
</style>
