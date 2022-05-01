<script lang="ts">
  import VariableFlash from '../common/VariableFlash.svelte';
  import VariableNotice from '../common/VariableNotice.svelte';
  import VariableDialog from '../common/VariableDialog.svelte';
  import HeaderBar from '../components/HeaderBar.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import { toSvelteTarget } from '../targets.svelte';
</script>

<div class="page">
  <HeaderBar />
  <slot />
  <VariableDialog {currentDialog} {toSvelteTarget} />
  <VariableNotice />
  <VariableFlash />
</div>

<style>
  .page {
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding-top: 0.2rem;
    margin: 0 auto;
    max-width: 1024px;
  }
</style>
