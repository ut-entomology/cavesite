<script lang="ts">
  import AdminTabRoute from '../../../components/AdminTabRoute.svelte';
  import { pageName } from '../../../stores/pageName';

  $pageName = 'Private Coordinates';
</script>

<AdminTabRoute activeTab="Coordinates">Private coordinates</AdminTabRoute>
