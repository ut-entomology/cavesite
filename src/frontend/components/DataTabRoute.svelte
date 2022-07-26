<script lang="ts">
  import RouteTab, { type Tab } from './RouteTab.svelte';
  import { appInfo } from '../stores/app_info';

  export let activeTab: string;

  const tabs: Tab[] = [
    {
      label: 'Welcome',
      route: '/'
    },
    {
      label: 'Taxa',
      route: '/taxa'
    },
    {
      label: 'Locations',
      route: '/locations'
    },
    {
      label: 'Time',
      route: '/time'
    },
    {
      label: 'Predictions',
      route: '/predictions'
    },
    {
      label: 'Queries',
      route: '/queries'
    }
  ];

  for (const hiddenRoute of $appInfo.hiddenRoutes) {
    const hiddenTabIndex = tabs.findIndex((tab) => tab.route == hiddenRoute);
    if (hiddenTabIndex >= 0) tabs.splice(hiddenTabIndex, 1);
  }
</script>

<RouteTab {tabs} {activeTab}>
  <slot />
</RouteTab>
