<script lang="ts">
  import StatusMessage from './StatusMessage.svelte';
  import BigSpinner from '../components/BigSpinner.svelte';

  export let message: string;
</script>

<StatusMessage {message} />
<BigSpinner centered={true} />
