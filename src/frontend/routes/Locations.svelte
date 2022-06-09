<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import { pageName } from '../stores/pageName';

  $pageName = 'Selected Locations';
</script>

<DataTabRoute activeTab="Locations">Location tools</DataTabRoute>
