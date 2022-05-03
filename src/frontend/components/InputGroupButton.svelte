<div class="input-group-btn">
  <button class="btn" type="button" on:click><slot /></button>
</div>

<style lang="scss">
  @import '../variables.scss';

  div {
    fill: $blueLinkForeColor;
    background-color: $minorButtonColor;
    border-radius: 0 $border-radius $border-radius 0;
  }

  div:hover {
    fill: $backgroundColor;
    background-color: $blueLinkForeColor;
  }
</style>
