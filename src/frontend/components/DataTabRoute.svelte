<script lang="ts">
  import RouteTab, { type Tab } from './RouteTab.svelte';
  import HowToUse from './HowToUse.svelte';
  import { appInfo } from '../stores/appInfo';
  import { showingHowTo } from '../stores/showingHowTo';

  export let activeTab: string;
  export let embedHowTo = false;

  const tabs: Tab[] = [
    {
      label: 'Welcome',
      route: '/'
    },
    {
      label: 'Predictions',
      route: '/predictions'
    }
  ];

  for (const hiddenRoute of $appInfo.hiddenRoutes) {
    const hiddenTabIndex = tabs.findIndex((tab) => tab.route == hiddenRoute);
    if (hiddenTabIndex >= 0) tabs.splice(hiddenTabIndex, 1);
  }
</script>

<RouteTab {tabs} {activeTab}>
  <slot name="body" />

  {#if $$slots['how-to'] && embedHowTo && !$showingHowTo}
    <div class="how_to_box">
      <h2>How to use the {activeTab} tab</h2>
      <HowToUse>
        <slot name="how-to" />
      </HowToUse>
    </div>
  {/if}
</RouteTab>

<style lang="scss">
  @import '../variables.scss';

  .how_to_box {
    border: solid 1px white;
    border-radius: $border-radius;
    max-width: 800px;
    margin: 0 auto 2rem auto;
    padding: 1.5rem 0 1rem 0;

    -webkit-box-shadow: 0px 0px 30px 10px rgba(0, 0, 0, 0.45);
    box-shadow: 0px 0px 30px 10px rgba(0, 0, 0, 0.45);
  }
</style>
