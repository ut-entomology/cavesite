<script lang="ts" context="module">
  import type { AxiosInstance } from 'axios';

  import { createSessionStore } from '../util/session_store';
  import { TaxonSpec, createTaxonSpecs, ROOT_TAXON } from '../../shared/taxa';
  import { client } from './client';

  export interface ContainingTaxon {
    spec: TaxonSpec;
    children: TaxonSpec[];
  }

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
    selectedUniques: string[]; // configures for loading during init()
    selectedSpecByUnique: Record<string, TaxonSpec> = {}; // derived
    rootNode: TaxonNode | null = null; // derived

    constructor(selectedUniques: string[]) {
      this.selectedUniques = selectedUniques;
    }

    async init(): Promise<void> {
      if (this.rootNode == null && this.selectedUniques.length > 0) {
        const res = await currentClient.post('api/taxa/get_list', {
          taxonUniques: this.selectedUniques
        });
        const specs: TaxonSpec[] = res.data.taxonSpecs;
        specs.forEach((spec) => this.addSelection(spec, false));
        this._setDerivedValues();
      }
    }

    addSelection(forSpec: TaxonSpec, save = true): void {
      const specs = createTaxonSpecs(forSpec);
      specs.push(forSpec); // specs won't be empty

      const rootSpec = specs.shift()!;
      if (!this.rootNode) {
        this.rootNode = { taxonSpec: rootSpec, children: [] };
      }
      let node = this.rootNode;
      for (const spec of specs) {
        let nextNode = node.children.find(
          (child) => child.taxonSpec.unique == spec.unique
        );
        if (!nextNode) {
          nextNode = { taxonSpec: spec, children: [] };
          node.children.push(nextNode);
        } else if (nextNode.taxonSpec.unique == forSpec.unique) {
          // selections are those without children;
          // they imply all subordinate taxa
          nextNode.children = [];
          break; // this is redundant but clarifies behavior
        }
        node = nextNode;
      }
      if (save) this._save();
    }

    removeSelection(spec: TaxonSpec, containingTaxa: ContainingTaxon[] | null): void {
      // Disallow removing the root taxon.
      if (spec.unique == ROOT_TAXON) return;

      const selectedSpecs = Object.values(this.selectedSpecByUnique);
      let specIndex = selectedSpecs.findIndex((s) => s.unique == spec.unique);

      // If the taxon is directly selected, rather than implicitly selected
      // by virtue of being subordinate to a direclty selected taxon...
      if (specIndex >= 0) {
        selectedSpecs.splice(specIndex, 1);
      }

      // Otherwise, the taxon must be implicitly selected by virtue of being
      // subordinate to a directly selected taxon. In this case, containingTaxa
      // must be supplied.
      else {
        if (containingTaxa === null) throw Error('Null containingTaxa');

        // Find the selected taxon that contains the to-be-removed taxon.

        let i = 0;
        while (i < containingTaxa.length) {
          if (this.selectedSpecByUnique[containingTaxa[i].spec.unique]) break;
          ++i;
        }

        // Deselect the selected taxon that contains the removed taxon.

        const containingSpec = containingTaxa[i].spec;
        specIndex = selectedSpecs.findIndex(
          (spec) => spec.unique == containingSpec.unique
        );
        selectedSpecs.splice(specIndex, 1);

        // Select all children of taxa that are both ancestors of the to-be-removed
        // taxon and descendants of the just-deselected ancestor taxon, except for
        // the taxa that are ancestors of the to-be-removed taxon.

        while (i < containingTaxa.length) {
          for (const childSpec of containingTaxa[i].children) {
            if (childSpec.unique != spec.unique) {
              selectedSpecs.push(childSpec);
            }
          }
          ++i;
        }

        // If no taxa remain selected, select the root taxon.

        if (selectedSpecs.length == 0) {
          selectedSpecs.push(containingTaxa[0].spec);
        }
      }

      // Regerate the tree of selected taxa and persist the newly selected taxa.

      this.rootNode = null;
      selectedSpecs.forEach((spec) => this.addSelection(spec, false));
      this._save();
    }

    private _save() {
      this._setDerivedValues();
      // saves to sessionStore
      selectedTaxa.set(this);
    }

    private _setDerivedValues() {
      this.selectedUniques = [];
      this.selectedSpecByUnique = {};
      this._tallyNode(this.rootNode!);
    }

    private _tallyNode(node: TaxonNode): void {
      const taxonUnique = node.taxonSpec.unique;
      if (node.children.length == 0) {
        this.selectedUniques.push(taxonUnique);
        this.selectedSpecByUnique[taxonUnique] = node.taxonSpec;
      } else {
        node.children.forEach((child) => this._tallyNode(child));
      }
    }
  }

  export const selectedTaxa = createSessionStore<SelectedTaxa, string[]>(
    'selected_taxa',
    new SelectedTaxa([ROOT_TAXON]),
    (data) => new SelectedTaxa(data),
    (value) => value.selectedUniques
  );
</script>
