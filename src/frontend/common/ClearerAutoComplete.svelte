<script lang="ts">
  import { onMount } from 'svelte';
  import AutoComplete from 'simple-svelte-autocomplete';
  import type { InputType } from 'sveltestrap/src/Input';

  export let inputSelector = '';
  export let value: string | undefined = undefined;
  export let setClearer: (clearer: () => void) => void = () => {};

  setClearer(clearInput);
  const reducedProps = Object.assign($$props);
  delete reducedProps['inputSelector'];
  delete reducedProps['setClearer'];

  let autocompleteClearButton: HTMLButtonElement;

  onMount(() => {
    const autocompleteInput = document.querySelector(
      inputSelector + ' .autocomplete-input'
    )!;
    autocompleteInput.addEventListener('input', _inputChanged);

    const autocompleteList = document.querySelector(
      inputSelector + ' .autocomplete-list'
    )!;
    autocompleteList.addEventListener('click', _setAutocomplete);

    autocompleteClearButton = document.querySelector(
      inputSelector + ' .autocomplete-clear-button'
    )!;
    autocompleteClearButton.addEventListener('click', _clearedAutocomplete);
    _toggleClearButton(false);
  });

  function clearInput() {
    autocompleteClearButton.click();
  }

  function _inputChanged() {
    // doesn't catch changes made from JS (e.g. clearing or list selection)
    // @ts-ignore
    const inputElem = this as HTMLInputElement;
    const newValue = inputElem.value;
    _toggleClearButton(!!newValue);
    if (newValue.toLowerCase() != value?.toLowerCase()) {
      value = undefined;
    }
    // If you don't force lowercase, you have to use the built-in cleanup,
    // which doesn't allow the user to search for punctuation.
    if (newValue != newValue.toLowerCase()) {
      inputElem.value = newValue.toLowerCase();
    }
  }

  function _clearedAutocomplete() {
    value = undefined;
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

<AutoComplete bind:value {...reducedProps} showClear={true}>
  <svelte:fragment slot="item" let:label let:item>
    {#if $$slots['item']}
      <slot name="item" {label} {item} />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="no-results" let:noResultsText>
    {#if $$slots['no-results']}
      <slot name="no-results" {noResultsText} />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="loading" let:loadingText>
    {#if $$slots['loading']}
      <slot name="loading" {loadingText} />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="tag" let:label let:item let:unselectItem>
    {#if $$slots['tag']}
      <slot name="tag" {label} {item} {unselectItem} />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="menu-header" let:nbItems let:maxItemsToShowInList>
    {#if $$slots['menu-header']}
      <slot name="menu-header" {nbItems} {maxItemsToShowInList} />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="dropdown-footer" let:nbItems let:maxItemsToShowInList>
    {#if $$slots['dropdown-footer']}
      <slot name="dropdown-footer" {nbItems} {maxItemsToShowInList} />
    {/if}
  </svelte:fragment>
</AutoComplete>

<style>
  :global(span.autocomplete-clear-button) {
    opacity: 0.6;
  }
</style>
