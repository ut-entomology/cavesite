<script lang="ts">
  // Not yet working because I don't know how to forward propagate slots to
  // AutoComplete while also back-propagating AutoComplete's slot values.

  import { onMount } from 'svelte';
  import AutoComplete from 'simple-svelte-autocomplete';

  export let setClearer: (clearer: () => void) => void = () => {};
  setClearer(clearInput);

  let selection: string | undefined;
  let autocompleteClearButton: HTMLButtonElement;

  onMount(() => {
    const autocompleteInput = document.querySelector('input.autocomplete-input')!;
    autocompleteInput.addEventListener('input', _inputChanged);

    const autocompleteList = document.querySelector('div.autocomplete-list')!;
    autocompleteList.addEventListener('click', _setAutocomplete);

    autocompleteClearButton = document.querySelector('span.autocomplete-clear-button')!;
    autocompleteClearButton.addEventListener('click', _clearedAutocomplete);
    _toggleClearButton(false);
  });

  function clearInput() {
    autocompleteClearButton.click();
  }

  function _inputChanged() {
    // doesn't catch changes made from JS (e.g. clearing or list selection)
    // @ts-ignore
    const newValue = this.value;
    _toggleClearButton(!!newValue);
    if (newValue.toLowerCase() != selection?.toLowerCase()) {
      selection = undefined;
    }
  }

  function _clearedAutocomplete() {
    selection = undefined;
    _toggleClearButton(false);
  }

  function _setAutocomplete() {
    _toggleClearButton(true);
  }

  function _toggleClearButton(show: boolean) {
    autocompleteClearButton.setAttribute(
      'style',
      'display:' + (show ? 'block' : 'none')
    );
  }
</script>

<AutoComplete bind:value={selection} {...$$props} showClear={true}>
  <!-- <slot slot="item" name="item" let:label let:item {label} {item} /> -->
</AutoComplete>

<style>
  :global(span.autocomplete-clear-button) {
    opacity: 0.6;
  }
</style>
