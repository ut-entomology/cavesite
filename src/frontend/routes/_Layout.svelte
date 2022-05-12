<script lang="ts">
  import VariableFlash from '../common/VariableFlash.svelte';
  import VariableNotice from '../common/VariableNotice.svelte';
  import VariableDialog from '../common/VariableDialog.svelte';
  import HeaderBar from '../components/HeaderBar.svelte';
  import { globalDialog } from '../stores/globalDialog.svelte';
  import { toSvelteTarget } from '../targets.svelte';
</script>

<div class="page">
  <HeaderBar />
  <slot />
  <VariableDialog {globalDialog} {toSvelteTarget} />
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
