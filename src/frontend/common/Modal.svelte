<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  const FLY_IN_Y = -50;
  const FLY_IN_DURATION = 300;
  const BACKDROP_FADE_DURATION = 150;

  export let dialogClasses = '';
  export let contentClasses = '';
  export let maxWidth = '';
  export let onClose: (() => void) | null = null;

  $: style = maxWidth == '' ? '' : `max-width: ` + maxWidth;

  let modalElement: HTMLElement;
  let triggeringElement: Element | null;
  try {
    triggeringElement = document.activeElement;
  } catch (err) {
    triggeringElement = null;
  }
  document.body.classList.add('modal-open');

  onDestroy(() => {
    document.body.classList.remove('modal-open');
    if (triggeringElement && triggeringElement instanceof HTMLElement) {
      if (typeof triggeringElement.focus === 'function') {
        triggeringElement.focus();
      }
    }
  });

  function scrollToModalTop() {
    modalElement.scrollTop = 0;
  }
</script>

<div
  class="modal fade show"
  role="dialog"
  style="display: block"
  bind:this={modalElement}
>
  <div class="min_borders">
    <div
      class="modal-dialog {dialogClasses}"
      {style}
      role="document"
      in:fly={{ y: FLY_IN_Y, duration: FLY_IN_DURATION }}
      out:fly={{ y: FLY_IN_Y, duration: FLY_IN_DURATION, easing: quintOut }}
    >
      <div class="modal-content {contentClasses}">
        {#if onClose}
          <div class="x_bubble" on:click={onClose}><div>&times;</div></div>
        {/if}
        <slot {scrollToModalTop} />
      </div>
    </div>
  </div>
</div>
<div
  class="modal-backdrop show"
  transition:fade={{ duration: BACKDROP_FADE_DURATION }}
/>

<style>
  .min_borders {
    position: relative;
    padding: 0 2%;
  }
  .x_bubble {
    position: absolute;
    top: -0.5rem;
    right: -0.5rem;
    width: 2rem;
    height: 2rem;
    border: 2px solid #0150e4;
    border-radius: 1rem;
    color: #0150e4;
    background-color: white;
    cursor: pointer;
  }
  .x_bubble div {
    font-size: 2rem;
    margin-top: -0.8rem;
    text-align: center;
  }
</style>
