<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  const FLY_IN_Y = -50;
  const FLY_IN_DURATION = 300;
  const BACKDROP_FADE_DURATION = 150;

  export let dialogClasses = '';
  export let contentClasses = '';

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
</script>

<div class="modal fade show" role="dialog" style="display: block">
  <div
    class="modal-dialog {dialogClasses}"
    role="document"
    in:fly={{ y: FLY_IN_Y, duration: FLY_IN_DURATION }}
    out:fly={{ y: FLY_IN_Y, duration: FLY_IN_DURATION, easing: quintOut }}
  >
    <div class="modal-content {contentClasses}">
      <slot />
    </div>
  </div>
</div>
<div
  class="modal-backdrop show"
  transition:fade={{ duration: BACKDROP_FADE_DURATION }}
/>
