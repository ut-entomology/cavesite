<script lang="ts">
  import RouteTab, { type Tab } from './RouteTab.svelte';

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
      label: 'Effort',
      route: '/effort'
    },
    {
      label: 'Data',
      route: '/data'
    }
  ];
</script>

<RouteTab {tabs} {activeTab}>
  <slot />
</RouteTab>
