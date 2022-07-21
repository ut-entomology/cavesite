{#if $$slots.default}
  <div class="row mt-2 justify-content-center small footnotes">
    <div class="col-auto">
      <ul>
        <slot />
      </ul>
    </div>
  </div>
{/if}

<style lang="scss">
  @import '../variables.scss';

  ul {
    margin: 0;
  }

  .footnotes {
    color: $footnoteColor;
  }
</style>
