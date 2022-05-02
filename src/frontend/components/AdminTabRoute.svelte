<script lang="ts">
  import RouteTab, { type Tab } from './RouteTab.svelte';

  export let activeTab: string;

  const tabs: Tab[] = [
    {
      label: 'Users',
      route: '/admin/users'
    },
    {
      label: 'Coordinates',
      route: '/admin/coords'
    },
    {
      label: 'Schedule',
      route: '/admin/schedule'
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
