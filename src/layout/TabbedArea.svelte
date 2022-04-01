<script lang='ts' context='module'>
  import type { SvelteComponent } from "svelte";

  export interface Tab {
    tabID: number;
    label: string;
    component: typeof SvelteComponent;
  }
</script>

<script lang='ts'>
  // Modified from https://svelte.dev/repl/cf05bd4a4ca14fb8ace8b6cdebbb58da?version=3.17.0

  export let tabs: Tab[] = [];
  export let activeTabID = 1;

  const handleClick = (tabID: number) => () => (activeTabID = tabID);
</script>

<ul>
{#each tabs as tab}
	<li class={activeTabID === tab.tabID ? 'active' : ''}>
		<span on:click={handleClick(tab.tabID)}>{tab.label}</span>
	</li>
{/each}
</ul>
{#each tabs as tab}
	{#if activeTabID == tab.tabID}
	<div class="box">
		<svelte:component this={tab.component}/>
	</div>
	{/if}
{/each}
<style>
	.box {
		margin-bottom: 10px;
		padding: 40px;
		border: 1px solid #dee2e6;
    border-radius: 0 0 .5rem .5rem;
    border-top: 0;
	}
  ul {
    display: flex;
    flex-wrap: wrap;
    padding-left: 0;
    margin-bottom: 0;
    list-style: none;
    border-bottom: 1px solid #dee2e6;
  }
	li {
		margin-bottom: -1px;
	}

  span {
    border: 1px solid transparent;
    border-top-left-radius: 0.25rem;
    border-top-right-radius: 0.25rem;
    display: block;
    padding: 0.5rem 1rem;
    cursor: pointer;
  }

  span:hover {
    border-color: #e9ecef #e9ecef #dee2e6;
  }

  li.active > span {
    color: #495057;
    background-color: #fff;
    border-color: #dee2e6 #dee2e6 #fff;
  }
</style>
