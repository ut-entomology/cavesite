<script lang="ts" context="module">
  // External to this module, the taxa that this module ultimately selects are
  // called "selected" taxa. Internal to the module, these are called "included"
  // taxa, because "selected" taxa are those with checked checkboxes.

  import type { AxiosInstance } from 'axios';

  import { createSessionStore } from '../util/session_store';
  import { TaxonSpec, createTaxonSpecs } from '../../shared/taxa';
  import {
    InteractiveTreeFlags,
    InteractiveTreeNode
  } from '../components/InteractiveTree.svelte';
  import { client } from './client';

  export const CONTAINS_INCLUDED_TAXA_FLAG = 1 << 15;
  export const COLLECTED_LEAF_FLAG = 1 << 31;

  export interface TaxonNode extends InteractiveTreeNode {
    taxonSpec: TaxonSpec;
    children: TaxonNode[] | null; // redefines children
  }

  let currentClient: AxiosInstance;
  client.subscribe((newClient) => (currentClient = newClient));

  /**
   * SelectedTaxa is a class representing the taxa that have been selected
   * for constraining queries. It contains a tree of taxa, and the selections
   * are the leaf nodes of this tree but not any parent nodes.
   */

  export class SelectedTaxa {
    selectedUniques: string[]; // configures for loading
    rootNode: TaxonNode | null = null; // must be loaded
    nodesByTaxonUnique: Record<string, TaxonNode> = {};

    constructor(selectedUniques: string[]) {
      this.selectedUniques = selectedUniques;
    }

    async load(): Promise<void> {
      if (this.rootNode == null && this.selectedUniques.length > 0) {
        const res = await currentClient.post('api/taxa/get_list', {
          taxonUniques: this.selectedUniques
        });
        const specs: TaxonSpec[] = res.data.taxonSpecs;
        specs.forEach((spec) => this.addSelection(spec));
      }
    }

    addSelection(forSpec: TaxonSpec): void {
      const specs = createTaxonSpecs(forSpec);
      specs.push(forSpec); // specs won't be empty

      if (!this.rootNode) {
        const rootSpec = specs.shift()!;
        this.rootNode = this._toDefaultNode(rootSpec);
      }
      let node = this.rootNode;
      for (const spec of specs) {
        let nextNode = this.nodesByTaxonUnique[spec.unique];
        if (!nextNode) {
          nextNode = this._toDefaultNode(spec);
          if (node.children === null) {
            node.children = [];
            node.nodeFlags |= InteractiveTreeFlags.Expanded;
          }
          node.children.push(nextNode);
          node = nextNode;
        } else if (nextNode.taxonSpec.unique == forSpec.unique) {
          nextNode.children = null;
          break; // this is redundant but clarifies behavior
        }
      }
      this._tallyNodes(); // inefficient, but simplifies code
      this.save();
    }

    dropCheckedTaxa() {
      if (this.rootNode) {
        this._dropCheckedTaxa(this.rootNode);
        this._tallyNodes(); // inefficient, but simplifies code
        this.save();
      }
    }

    removeTaxon(spec: TaxonSpec): void {
      const node = this.nodesByTaxonUnique[spec.unique];
      if (!node) return;

      const containingSpecs = createTaxonSpecs(spec);
      if (containingSpecs.length == 0) {
        this.selectedUniques = [];
        this.rootNode = null;
        this.nodesByTaxonUnique = {};
      } else {
        const parentSpec = containingSpecs.pop()!;
        const parentNode = this.nodesByTaxonUnique[parentSpec.unique]!;
        const childIndex = parentNode.children!.indexOf(node);
        parentNode.children!.splice(childIndex, 1);
        if (parentNode.children!.length == 0) {
          parentNode.children = null;
        }
      }
      this._tallyNodes(); // inefficient, but simplifies code
      this.save();
    }

    // Saves to sessionStore
    save() {
      selectedTaxa.set(this);
    }

    private _tallyNodes(): void {
      this.selectedUniques = [];
      this.nodesByTaxonUnique = {};
      if (this.rootNode) {
        this._tallyNode(this.rootNode);
      }
    }

    private _tallyNode(node: TaxonNode): void {
      const taxonUnique = node.taxonSpec.unique;
      if (node.children === null) {
        this.selectedUniques.push(taxonUnique);
      } else {
        node.children.forEach((child) => this._tallyNode(child));
      }
      this.nodesByTaxonUnique[taxonUnique] = node;
    }

    private _toDefaultNode(spec: TaxonSpec): TaxonNode {
      return {
        taxonSpec: spec,
        nodeFlags:
          InteractiveTreeFlags.Selectable | InteractiveTreeFlags.IncludesDescendants,
        children: null
      };
    }

    private _dropCheckedTaxa(fromNode: TaxonNode) {
      if (!fromNode.children) return;
      let i = 0;
      while (i < fromNode.children.length) {
        const child = fromNode.children[i];
        if (child.nodeFlags & InteractiveTreeFlags.Selected) {
          fromNode.children.splice(i, 1);
        } else {
          this._dropCheckedTaxa(child);
          ++i;
        }
      }
    }
  }

  export const selectedTaxa = createSessionStore<SelectedTaxa | null, string[]>(
    'selected_taxa',
    null,
    (data) => new SelectedTaxa(data),
    (value) => (value ? value.selectedUniques : [])
  );
</script>
