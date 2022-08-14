<script lang="ts">
  import VariableFlash from '../common/VariableFlash.svelte';
  import VariableNotice from '../common/VariableNotice.svelte';
  import HeaderBar from '../components/HeaderBar.svelte';
</script>

<div class="page">
  <HeaderBar />
  <slot />
  <VariableNotice />
  <VariableFlash />
</div>

<style lang="scss" global>
  @import '../variables.scss';

  :global(body) {
    background-color: $backgroundColor;
  }

  .page {
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0.2rem 1.5rem 0 1.5rem;
    margin: 0 auto;
    max-width: 1024px;
  }
</style>
