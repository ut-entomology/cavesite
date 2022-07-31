<div class="how_to_body">
  <slot />
</div>

<style lang="scss">
  @import '../variables.scss';

  .how_to_body {
    margin: 0 1.5rem 1rem 1.5rem;
    font-size: 0.95rem;
  }

  .how_to_body :global(h3) {
    font-size: 1.2rem;
    font-weight: bold;
  }
</style>
