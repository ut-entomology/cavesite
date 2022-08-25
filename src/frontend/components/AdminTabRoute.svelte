<script lang="ts">
  import RouteTab, { type Tab } from './RouteTab.svelte';

  export let activeTab: string;

  const tabs: Tab[] = [
    {
      label: 'Files',
      route: '/admin/files'
    },
    {
      label: 'Schedule',
      route: '/admin/schedule'
    },
    {
      label: 'Users',
      route: '/admin/users'
    },
    {
      label: 'Logs',
      route: '/admin/logs'
    }
  ];
</script>

<RouteTab {tabs} {activeTab}>
  <slot />
</RouteTab>
