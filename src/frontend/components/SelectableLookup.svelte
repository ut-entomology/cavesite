<script lang="ts" context="module">
  export interface MatchedItem {
    unique: string;
    name: string;
    spec: ModelSpec;
  }
</script>

<script lang="ts">
  import ClearerAutoComplete from '../common/ClearerAutoComplete.svelte';
  import SelectionButton from '../components/SelectionButton.svelte';
  import LoupeButton from './LoupeButton.svelte';
  import { errorReason } from '../stores/client';
  import type { ModelSpec } from '../../shared/model';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection,
    SelectionsTree
  } from '../../frontend-core/selections/selections_tree';
  import { showNotice } from '../common/VariableNotice.svelte';

  const LOAD_DELAY_MILLIS = 333;

  export let typeLabel: string;
  export let selectionsTree: SelectionsTree<ModelSpec>;
  export let loadMatches: (partialName: string) => Promise<ModelSpec[]>;
  export let loadSpecIndicatingChildren: (unique: string) => Promise<ModelSpec | null>;
  export let getContainingSpecs: (
    ofSpec: ModelSpec,
    includesGivenSpec: boolean
  ) => Promise<SpecNode<ModelSpec>[]>;
  export let createContainingSpecs: (spec: ModelSpec) => ModelSpec[];
  export let createMatchedItem: (spec: ModelSpec) => MatchedItem;
  export let toItemHtml: (spec: ModelSpec, label: string) => string;
  export let checkNameEquivalence: (spec: ModelSpec, name: string) => boolean;
  export let addSelection: AddSelection<ModelSpec>;
  export let removeSelection: RemoveSelection<ModelSpec>;
  export let openUnique: (selectedUnique: string) => Promise<void>;
  export let setClearer: (clearer: () => void) => void;

  let matchedSpecs: ModelSpec[] = [];
  let selection: string | undefined;
  let isSelectedInTree = false;
  let selectedSpec: ModelSpec | null = null;
  let specsByUnique: Record<string, ModelSpec> = {};

  $: if (selection && selection != '') {
    selectedSpec = matchedSpecs.find((spec) => spec.unique == selection)!;
    isSelectedInTree = selectionsTree.isSelected(selectedSpec.unique);
    if (!isSelectedInTree) {
      const containingSpecs = createContainingSpecs(selectedSpec);
      for (const containingSpec of containingSpecs) {
        if (selectionsTree.isSelected(containingSpec.unique)) {
          isSelectedInTree = true;
          break;
        }
      }
    }
  } else {
    selectedSpec = null;
  }

  $: loupeLabel = `Open ${typeLabel} in browser`;

  async function _loadMatches(partialName: string): Promise<MatchedItem[]> {
    matchedSpecs = await loadMatches(partialName);
    if (matchedSpecs!.length == 0) {
      return [];
    } else {
      specsByUnique = {};
      let equivalentNamesCount = 0;
      let equivalentSelection = '';
      for (const spec of matchedSpecs!) {
        specsByUnique[spec.unique] = spec;
        if (checkNameEquivalence(spec, partialName)) {
          ++equivalentNamesCount;
          equivalentSelection = spec.unique;
        }
      }
      // Only show controls if the partialName matches exactly one list item.
      if (equivalentNamesCount == 1) {
        selection = equivalentSelection;
      }
    }
    return matchedSpecs
      .map((spec) => createMatchedItem(spec))
      .sort((a, b) => (a.unique < b.unique ? -1 : 1));
  }

  async function _openSelectedSpec() {
    const spec = await _loadSpecIndicatingChildren(selectedSpec!.unique);
    if (spec) {
      if (spec.hasChildren) {
        openUnique(spec.unique);
      } else {
        const containingSpecs = createContainingSpecs(spec);
        openUnique(containingSpecs[containingSpecs.length - 1].unique);
      }
    }
  }

  async function _addSelection() {
    const spec = await _loadSpecIndicatingChildren(selectedSpec!.unique);
    if (spec) {
      addSelection(spec);
      isSelectedInTree = true;
    }
  }

  async function _loadSpecIndicatingChildren(
    unique: string
  ): Promise<ModelSpec | null> {
    try {
      return await loadSpecIndicatingChildren(unique);
    } catch (err: any) {
      showNotice({
        header: 'ERROR',
        alert: 'danger',
        message: errorReason(err.response)
      });
      return null;
    }
  }

  async function _removeSelection() {
    const containingSpecs = await getContainingSpecs(selectedSpec!, false);
    removeSelection(containingSpecs, selectedSpec!);
    isSelectedInTree = false;
  }
</script>

<div class="row justify-content-center gx-0">
  <div class="col-sm-1 text-end auto_control">
    {#if selectedSpec}
      <SelectionButton
        selected={isSelectedInTree}
        addSelection={_addSelection}
        removeSelection={_removeSelection}
      />
    {/if}
  </div>
  <div class="col selectable_autocomplete">
    <ClearerAutoComplete
      className="outer_auto_complete"
      inputClassName="form-control"
      bind:value={selection}
      searchFunction={_loadMatches}
      localFiltering={false}
      delay={LOAD_DELAY_MILLIS}
      valueFieldName="unique"
      labelFieldName="name"
      placeholder="Type a {typeLabel} to look up"
      minCharactersToSearch={2}
      hideArrow={true}
      cleanUserText={false}
      {setClearer}
    >
      <div slot="item" let:label let:item>{@html toItemHtml(item.spec, label)}</div>
    </ClearerAutoComplete>
  </div>
  <div class="col-sm-1 auto_control">
    {#if selectedSpec}
      <LoupeButton label={loupeLabel} on:click={_openSelectedSpec} />
    {/if}
  </div>
</div>

<style lang="scss">
  .selectable_autocomplete :global(.autocomplete-list-item span) {
    font-size: 0.8em;
    color: #999;
  }
  .selectable_autocomplete :global(.autocomplete-list-item.selected span) {
    color: #ddd;
  }
  :global(.outer_auto_complete) {
    width: 100%;
  }
  :global(span.autocomplete-clear-button) {
    opacity: 0.6;
  }
  .auto_control {
    margin-top: 0.05rem;
  }
</style>
