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
  import CircleIconButton from './CircleIconButton.svelte';
  import { errorReason } from '../stores/client';
  import type { ModelSpec } from '../../shared/model';
  import type {
    SpecNode,
    AddSelection,
    RemoveSelection,
    SelectionsTree
  } from '../../frontend-core/selections_tree';
  import { showNotice } from '../common/VariableNotice.svelte';

  const LOAD_DELAY_MILLIS = 333;
  const loupeIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
<g><path d="M497.938,430.063l-126.914-126.91C389.287,272.988,400,237.762,400,200C400,89.719,310.281,0,200,0
		C89.719,0,0,89.719,0,200c0,110.281,89.719,200,200,200c37.762,0,72.984-10.711,103.148-28.973l126.914,126.91
		C439.438,507.313,451.719,512,464,512c12.281,0,24.563-4.688,33.938-14.063C516.688,479.195,516.688,448.805,497.938,430.063z
		M64,200c0-74.992,61.016-136,136-136s136,61.008,136,136s-61.016,136-136,136S64,274.992,64,200z"/></g></svg>`;

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

  async function _loadMatches(partialName: string): Promise<MatchedItem[]> {
    matchedSpecs = await loadMatches(partialName);
    if (matchedSpecs!.length == 0) {
      return [];
    } else {
      specsByUnique = {};
      for (const spec of matchedSpecs!) {
        specsByUnique[spec.unique] = spec;
        if (spec.unique.toLowerCase() == partialName.toLowerCase()) {
          selection = spec.unique;
        }
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
      <CircleIconButton class="loupe_button" label="Open {typeLabel} in browser">
        <div class="loupe_icon" on:click={_openSelectedSpec}>
          {@html loupeIcon}
        </div>
      </CircleIconButton>
    {/if}
  </div>
</div>

<style lang="scss">
  @import '../variables.scss';

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
  :global(.loupe_button) {
    margin-left: 0.5rem;
    width: 1.5rem;
    height: 1.5rem;
    padding-left: 0.25rem;
  }
  .loupe_icon {
    margin-top: -0.1rem;
    width: 1rem;
    height: 1rem;
    fill: $blueLinkForeColor;
    cursor: pointer;
  }
  .loupe_icon:hover {
    fill: white;
  }
</style>
