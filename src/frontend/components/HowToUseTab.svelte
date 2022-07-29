<script lang="ts">
  export let tabName: string;
</script>

<div class="how_to_box">
  <div class="title">How to use the {tabName} tab</div>
  <div class="body">
    <slot />
  </div>
</div>

<style lang="scss">
  @import '../variables.scss';

  .how_to_box {
    border: solid 1px black;
    border-radius: $border-radius;
    max-width: 800px;
    margin: 0 auto;
  }
  .title {
    margin: 1rem auto;
    text-align: center;
    font-weight: bold;
    font-size: 1.1rem;
  }
  .body {
    margin: 0 1.5rem 1rem 1.5rem;
  }
</style>
