<script lang="ts">
  import AdminTabRoute from '../../../components/AdminTabRoute.svelte';
  import { pageName } from '../../../stores/pageName';

  $pageName = 'Data Files';
</script>

<AdminTabRoute activeTab="Files">Data files</AdminTabRoute>
