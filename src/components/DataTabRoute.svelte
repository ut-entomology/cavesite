<script lang='ts'>
  import RouteTab, { type Tab } from "../layout/RouteTab.svelte";

  export let activeTab: string;

  const tabs: Tab[] = [
    {
      label: 'About',
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
      label: 'Specimens',
      route: '/specimens'
    },
  ];
</script>

<RouteTab {tabs} {activeTab}>
  <slot></slot>
</RouteTab>