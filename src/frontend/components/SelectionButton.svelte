<script lang="ts" context="module">
  export const checkmarkIcon = '&#10003;';
  export const plusIcon = '+';
</script>

<script lang="ts">
  import CircleIconButton from '../components/CircleIconButton.svelte';

  export let selected: boolean;
  export let addSelection: () => void;
  export let removeSelection: () => void;
</script>

{#if selected}
  <CircleIconButton
    class="selection selector"
    on:click={removeSelection}
    label="Remove from selections"
  >
    <div />
  </CircleIconButton>
{:else}
  <CircleIconButton class="selector" on:click={addSelection} label="Add to selections">
    <div>{@html plusIcon}</div>
  </CircleIconButton>
{/if}

<style lang="scss">
  @import '../variables.scss';

  :global(.selector) {
    display: inline-block;
    margin-top: -0.05rem;
    margin-right: 0.5rem;
    width: 1.4rem;
    height: 1.4rem;
    line-height: 1.1rem;
    font-size: 1.2rem;
    font-weight: bold;
  }

  :global(.selection.icon_button.selector div:after) {
    content: '\2713';
  }

  :global(.selection.icon_button.selector:hover div:after) {
    content: '-';
  }

  :global(.selector div) {
    margin-top: 0.05rem;
  }
</style>
