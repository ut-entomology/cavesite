<script lang="ts">
  import InfoDialog from '../dialogs/InfoDialog.svelte';
  import HowToUse from './HowToUse.svelte';
  import { showingHowTo } from '../stores/showingHowTo';

  const expandIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1000 1000" enable-background="new 0 0 1000 1000" xml:space="preserve" transform="rotate(-90)">
    <g><path d="M274,21.6L274,21.6c-8.8-7.2-20.1-11.6-32.4-11.6c-28.3,0-51.2,22.9-51.2,51.2l-0.2,0.1l0.2,877.6c0.1,28.2,23,51,51.2,51c13.4,0,25.6-5.2,34.8-13.6l513.3-436.7c12.3-9.4,20.2-24.1,20.2-40.7c0-16.1-7.5-30.5-19.1-39.9v0L274.4,21.9C274.3,21.8,274.2,21.7,274,21.6L274,21.6L274,21.6z"/></g></svg>`;
  const collapseIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1000 1000" enable-background="new 0 0 1000 1000" xml:space="preserve" transform="rotate(90)">
    <g><path d="M274,21.6L274,21.6c-8.8-7.2-20.1-11.6-32.4-11.6c-28.3,0-51.2,22.9-51.2,51.2l-0.2,0.1l0.2,877.6c0.1,28.2,23,51,51.2,51c13.4,0,25.6-5.2,34.8-13.6l513.3-436.7c12.3-9.4,20.2-24.1,20.2-40.7c0-16.1-7.5-30.5-19.1-39.9v0L274.4,21.9C274.3,21.8,274.2,21.7,274,21.6L274,21.6L274,21.6z"/></g></svg>`;

  export let tabName: string;
  export let title: string;
  export let center = true;
  export let expandable = false;

  let expanded = false;

  function toggleExpansion() {
    const mainList = document.getElementsByTagName('main')!;
    if (expanded) {
      mainList[0].classList.remove('full_screen_tab');
    } else {
      mainList[0].classList.add('full_screen_tab');
    }
    expanded = !expanded;
  }
</script>

<div class="row mt-3 mb-3 justify-content-between">
  <div class="col-auto tab_title">
    {@html title}
    {#if $$slots['how-to']}
      <div class="how_to_button" on:click={() => ($showingHowTo = true)}>
        <div>?</div>
      </div>
    {/if}
    {#if expandable}
      <div class="expander">
        <button
          class="btn btn-minor"
          type="button"
          title="Expand/collapse full-screen view"
          on:click={toggleExpansion}
        >
          {#if expanded}
            {@html collapseIcon}
          {:else}
            {@html expandIcon}
          {/if}
        </button>
      </div>
    {/if}
    <slot name="title-button" />
  </div>
  <div class="col-auto main-buttons">
    <slot name="main-buttons" />
  </div>
</div>
{#if $$slots.instructions}
  <div class="row justify-content-center">
    <div class="tab-instructions"><slot name="instructions" /></div>
  </div>
{/if}
{#if $$slots['work-buttons']}
  <div class="row mb-2" class:justify-content-center={center}>
    <div class={center ? 'col-auto' : 'col'}>
      <slot name="work-buttons" />
    </div>
  </div>
{/if}

{#if $showingHowTo}
  <InfoDialog
    title="How to use the {tabName} tab"
    classes="how_to_dialog"
    maxWidth="800px"
    onClose={() => ($showingHowTo = false)}
  >
    <HowToUse>
      <slot name="how-to" />
    </HowToUse>
  </InfoDialog>
{/if}

<style lang="scss">
  @import '../variables.scss';

  :global(.full_screen_tab) {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }

  .tab_title {
    font-weight: bold;
    font-size: 1.2rem;
  }
  .tab-instructions {
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  .main-buttons :global(button) {
    margin-left: 0.4rem;
  }
  .how_to_button {
    display: inline-block;
    vertical-align: middle;
    margin-top: -0.2rem;
    margin-left: 0.2rem;
    width: 1.3rem;
    height: 1.3rem;
    text-align: center;
    font-size: 1rem;
    font-weight: bold;
    color: $blueLinkForeColor;
    border: 2px solid $blueLinkForeColor;
    border-radius: 0.65rem;
    cursor: pointer;
  }
  .how_to_button div {
    margin-top: -0.2rem;
  }
  .expander {
    display: inline-block;
  }
  .expander button {
    padding: 0rem 0.3rem;
    margin-top: -0.15rem;
    margin-left: 0.5rem;
  }
  .expander :global(svg) {
    margin-top: -0.25rem;
    width: 1rem;
    height: 1rem;
    fill: $blueLinkForeColor;
  }
</style>
