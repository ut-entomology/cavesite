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

<nav>
  <ul>
    {#each tabs as tab}
      <li class={activeTab === tab.label ? 'active' : ''}>
        <span on:click={handleClick(tab.label)}>{tab.label}</span>
      </li>
    {/each}
  </ul>
</nav>
<main>
  {#each tabs as tab}
    {#if activeTab == tab.label}
      <slot />
    {/if}
  {/each}
</main>

<style lang="scss">
  @import '../variables.scss';

  ul {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding-left: 0;
    margin-bottom: 0;
    list-style: none;
    font-size: 1.1rem;
    border-bottom: 4px solid $texasRed;
  }

  span {
    display: block;
    padding: 0.3em 0.9em 0.2em 0.9em;
    color: $blueLinkForeColor;
    cursor: pointer;
    border-radius: 0.5em 0.5em 0 0;
    border-top: 1px solid $backgroundColor;
    border-left: 1px solid $backgroundColor;
    border-right: 1px solid $backgroundColor;
  }

  span:hover {
    background-color: $minorButtonColor;
    border-top: 1px solid $blueLinkBackColor;
    border-left: 1px solid $blueLinkBackColor;
    border-right: 1px solid $blueLinkBackColor;
  }

  li.active > span {
    color: #fff;
    background-color: $texasRed;
    border-top: 1px solid $texasRed;
    border-left: 1px solid $texasRed;
    border-right: 1px solid $texasRed;
  }

  main {
    background-color: #fff;
    flex-grow: 1;
    flex: auto;
    display: flex;
    flex-direction: column;
  }
</style>
