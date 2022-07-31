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
    border: solid 1px white;
    border-radius: $border-radius;
    max-width: 800px;
    margin: 2rem auto;
    padding: 0.5rem 0 1rem 0;
    font-size: 0.95rem;

    -webkit-box-shadow: 0px 0px 30px 10px rgba(0, 0, 0, 0.5);
    box-shadow: 0px 0px 30px 10px rgba(0, 0, 0, 0.5);
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
