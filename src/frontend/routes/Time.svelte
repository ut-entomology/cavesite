<script lang="ts">
  import DataTabRoute from '../components/DataTabRoute.svelte';
  import { pageName } from '../stores/pageName';

  $pageName = 'Time';
</script>

<DataTabRoute activeTab="Time">
  <p>Time tools</p>
  <p>User selects a date range and a time-of-year range</p>
</DataTabRoute>
