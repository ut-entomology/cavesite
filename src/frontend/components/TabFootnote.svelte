<script lang="ts">
  export let notes: string[];
</script>

<div class="row mt-5 mb-4 justify-content-center">
  <div class="col-md-10">
    <div class="footnotes">
      <div class="footnote_title">Important Notes</div>
      <ul>
        {#each notes as note}
          <li>{@html note}</li>
        {/each}
      </ul>
    </div>
  </div>
</div>

<style lang="scss">
  @import '../variables.scss';

  .footnotes {
    border-radius: $border-radius;
    border: 1px solid black;
    padding: 0 0.5em 0.5em 0.5em;
    color: #777;
    font-size: 0.9rem;
  }

  .footnote_title {
    font-weight: bold;
    width: fit-content;
    margin: -0.8em auto 0.5em auto;
    padding: 0 0.5em;
    background-color: white;
  }

  ul {
    margin-bottom: 0.8rem;
  }

  li + li {
    margin-top: 0.4rem;
  }
</style>
