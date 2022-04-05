<script lang='ts'>
  import { usingAdminTabs } from '../stores/usingAdminTabs';
  import AdminTabRoute from '../components/AdminTabRoute.svelte';
  import DataTabRoute from '../components/DataTabRoute.svelte';
</script>

{#if $usingAdminTabs}
  <AdminTabRoute activeTab='Users'>
    Users
  </AdminTabRoute>
{:else}
  <DataTabRoute activeTab='Welcome'>
    About this web site.
  </DataTabRoute>
{/if}