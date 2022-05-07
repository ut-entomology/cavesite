<script lang="ts" context="module">
  import type { AxiosInstance } from 'axios';

  import { createSessionStore } from '../util/session_store';
  import { TaxonSpec, createTaxonSpecs, ROOT_TAXON } from '../../shared/taxa';
  import { client } from './client';

  export interface TaxonNode {
    taxonSpec: TaxonSpec;
    children: TaxonNode[];
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

    async init(): Promise<void> {
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
        this.rootNode = { taxonSpec: rootSpec, children: [] };
      }
      let node = this.rootNode;
      for (const spec of specs) {
        let nextNode = this.nodesByTaxonUnique[spec.unique];
        if (!nextNode) {
          nextNode = { taxonSpec: spec, children: [] };
          node.children.push(nextNode);
          node = nextNode;
        } else if (nextNode.taxonSpec.unique == forSpec.unique) {
          nextNode.children = [];
          break; // this is redundant but clarifies behavior
        }
      }
      this.save();
    }

    removeTaxon(spec: TaxonSpec): void {
      const node = this.nodesByTaxonUnique[spec.unique];
      if (!node) return;

      const containingSpecs = createTaxonSpecs(spec);
      if (containingSpecs.length > 0) {
        const parentSpec = containingSpecs.pop()!;
        const parentNode = this.nodesByTaxonUnique[parentSpec.unique]!;
        const childIndex = parentNode.children.indexOf(node);
        parentNode.children.splice(childIndex, 1);
        if (parentNode.children.length == 0) {
          parentNode.children = [];
        }
        this.save();
      }
    }

    // Saves to sessionStore
    save() {
      this.selectedUniques = [];
      this.nodesByTaxonUnique = {};
      if (this.rootNode) {
        this._tallyNode(this.rootNode);
      }
      selectedTaxa.set(this);
    }

    private _tallyNode(node: TaxonNode): void {
      const taxonUnique = node.taxonSpec.unique;
      if (node.children.length == 0) {
        this.selectedUniques.push(taxonUnique);
      } else {
        node.children.forEach((child) => this._tallyNode(child));
      }
      this.nodesByTaxonUnique[taxonUnique] = node;
    }
  }

  export const selectedTaxa = createSessionStore<SelectedTaxa, string[]>(
    'selected_taxa',
    new SelectedTaxa([ROOT_TAXON]),
    (data) => new SelectedTaxa(data),
    (value) => value.selectedUniques
  );
</script>
