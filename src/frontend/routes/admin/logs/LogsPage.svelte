<script lang="ts">
  import AdminTabRoute from '../../../components/AdminTabRoute.svelte';
  import { pageName } from '../../../stores/pageName';

  $pageName = 'GBIF Import Logs';
</script>

<AdminTabRoute activeTab="Logs">Location tools</AdminTabRoute>
