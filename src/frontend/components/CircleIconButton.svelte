<script lang="ts">
  let classes = '';
  export { classes as class };
  export let bordered = false;
  export let label: string;
</script>

<div
  class="icon_button {classes}"
  class:bordered
  on:click
  title={label}
  aria-label={label}
>
  <slot />
</div>

<style lang="scss">
  @import '../variables.scss';

  .icon_button {
    display: inline-block;
    border-radius: 50%;
    color: $blueLinkBackColor;
    text-align: center;
    vertical-align: middle;
    cursor: pointer;
  }
  .icon_button:hover {
    color: $backgroundColor;
    background-color: $blueLinkBackColor;
  }
  .bordered {
    border: 1px solid $blueLinkBackColor;
  }
</style>
