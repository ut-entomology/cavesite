<script lang="ts">
  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import { pageName } from '../../stores/pageName';
  import { appInfo } from '../../stores/app_info';

  $pageName = 'Welcome';
  const tabName = 'Welcome';
</script>

<DataTabRoute activeTab={tabName}>
  <svelte:fragment slot="body">
    <div class="container-fluid mb-3">
      <TabHeader {tabName} title={$pageName} />
      {@html $appInfo.welcomeHTML}
    </div>
  </svelte:fragment>
</DataTabRoute>
