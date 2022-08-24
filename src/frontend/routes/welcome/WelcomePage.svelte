<script lang="ts">
  import DataTabRoute from '../../components/DataTabRoute.svelte';
  import TabHeader from '../../components/TabHeader.svelte';
  import { pageName } from '../../stores/pageName';
  import { DataKey } from '../../../shared/data_keys';
  import { appInfo } from '../../stores/app_info';
  import { loadKeyData } from '../../lib/key_data_client';
  import { client } from '../../stores/client';

  $pageName = 'Welcome';
  const tabName = 'Welcome';

  let html: string;

  async function prepare() {
    const data = await loadKeyData($client, false, DataKey.WelcomePageText);
    if (data === null || data == '') {
      html = 'Please setup the Welcome page in the admin Files tab.';
    } else {
      html = data
        .replace('{website-title}', $appInfo.appTitle)
        .replace('{website-subtitle}', $appInfo.appSubtitle);
    }
  }
</script>

<DataTabRoute activeTab={tabName}>
  <svelte:fragment slot="body">
    <div class="container-fluid mb-3">
      <TabHeader {tabName} title={$pageName} />
      {#await prepare() then}{@html html}{/await}
    </div>
  </svelte:fragment>
</DataTabRoute>
