<script lang="ts">
  export let centered = false;
</script>

<div class="big-spinner{centered ? '-centered' : ''} translate-middle">
  <div class="spinner-border text-warning" role="status">
    <span class="visually-hidden">Loading...</span>
  </div>
</div>

<style lang="scss">
  @import '../variables.scss';

  .big-spinner {
    position: fixed;
    z-index: 1031;
    top: $verticalMessagePosition;
    left: 50%;
  }

  .big-spinner-centered {
    position: fixed;
    z-index: 1031;
    top: 50%;
    left: 50%;
  }

  .big-spinner-centered div,
  .big-spinner div {
    width: 3rem;
    height: 3rem;
  }
</style>
