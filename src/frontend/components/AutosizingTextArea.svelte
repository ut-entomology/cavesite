<script lang="ts">
  import { afterUpdate } from 'svelte';

  // from https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas/

  export let text = '';

  let textareaElement: HTMLTextAreaElement;

  afterUpdate(replicate);

  function replicate() {
    // @ts-ignore type error about dataset not being there
    textareaElement.parentNode!.dataset.replicatedValue = text;
  }
</script>

<div class="grow-wrap">
  <textarea
    name="autosizing_textarea"
    id="autosizing_textarea"
    bind:this={textareaElement}
    on:input={replicate}
    bind:value={text}
  />
</div>

<style>
  .grow-wrap {
    /* easy way to plop the elements on top of each other and have them both sized based on the tallest one's height */
    display: grid;
  }
  .grow-wrap::after {
    /* Note the weird space! Needed to preventy jumpy behavior */
    content: attr(data-replicated-value) ' ';

    /* This is how textarea text behaves */
    white-space: pre-wrap;

    /* Hidden from view, clicks, and screen readers */
    visibility: hidden;
  }
  .grow-wrap > textarea {
    /* You could leave this, but after a user resizes, then it ruins the auto sizing */
    resize: none;

    /* Firefox shows scrollbar on growth, you can hide like this. */
    overflow: hidden;
  }
  .grow-wrap > textarea,
  .grow-wrap::after {
    /* Identical styling required!! */
    border: 1px solid black;
    padding: 0.5rem;
    font: inherit;

    /* Place on top of each other */
    grid-area: 1 / 1 / 2 / 2;
  }
</style>
