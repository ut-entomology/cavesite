<script lang="ts">
  import InfoDialog from '../../dialogs/InfoDialog.svelte';

  export let close: () => void;
</script>

<InfoDialog title="About Prediction Accuracy" maxWidth="800px" onClose={close}>
  About accuracy
</InfoDialog>
