<script lang="ts">
  import VariableFlash from '../common/VariableFlash.svelte';
  import VariableNotice from '../common/VariableNotice.svelte';
  import VariableDialog from '../common/VariableDialog.svelte';
  import HeaderBar from '../components/HeaderBar.svelte';
  import { currentDialog } from '../stores/currentDialog.svelte';
  import { toSvelteTarget } from '../targets.svelte';
</script>

<main class="container-lg">
  <HeaderBar />
  <slot />
  <VariableDialog {currentDialog} {toSvelteTarget} />
  <VariableNotice />
  <VariableFlash />
</main>

<style>
  main {
    margin: 0;
    padding: 0.2rem 1.5rem;
  }
</style>
