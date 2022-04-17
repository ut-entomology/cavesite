<script lang="ts" context="module">
  import page from 'page';

  export interface Tab {
    label: string;
    route: string;
  }
</script>

<script lang="ts">
  // Modified from https://svelte.dev/repl/cf05bd4a4ca14fb8ace8b6cdebbb58da?version=3.17.0

  export let tabs: Tab[];
  export let activeTab: string;

  const routesByLabel: Record<string, string> = {};
  tabs.forEach((tab) => {
    routesByLabel[tab.label] = tab.route;
  });

  function handleClick(label: string) {
    return () => page(routesByLabel[label]);
  }
</script>

<ul>
  {#each tabs as tab}
    <li class={activeTab === tab.label ? 'active' : ''}>
      <span on:click={handleClick(tab.label)}>{tab.label}</span>
    </li>
  {/each}
</ul>
{#each tabs as tab}
  {#if activeTab == tab.label}
    <slot />
  {/if}
{/each}

<style lang="scss">
  @import '../variables.scss';

  ul {
    display: flex;
    flex-wrap: wrap;
    padding-left: 0;
    margin-bottom: 0;
    list-style: none;
    border-bottom: 4px solid $texasRed;
  }

  span {
    display: block;
    padding: 0.4em 1em 0.35em 1em;
    color: #888;
    cursor: pointer;
    border-radius: 0.5em 0.5em 0 0;
  }

  span:hover {
    color: #fff;
    background-color: $texasRed;
    opacity: 0.6;
  }

  li.active > span {
    color: #fff;
    background-color: $texasRed;
    opacity: 1;
  }
</style>
