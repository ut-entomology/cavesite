<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import { pageName } from '../stores/pageName';

  $pageName = 'Welcome';
</script>

<DataTabRoute activeTab="Welcome">About this web site.</DataTabRoute>
