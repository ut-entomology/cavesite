<script lang="ts">
  import AdminTabRoute from '../../../components/AdminTabRoute.svelte';
  import { pageName } from '../../../stores/pageName';

  $pageName = 'GBIF Schedule';
</script>

<AdminTabRoute activeTab="Schedule">Download schedule</AdminTabRoute>
