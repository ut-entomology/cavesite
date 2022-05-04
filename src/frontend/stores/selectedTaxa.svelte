<script lang="ts" context="module">
  // External to this module, the taxa that this module ultimately selects are
  // called "selected" taxa. Internal to the module, these are called "included"
  // taxa, because "selected" taxa are those with checked checkboxes.

  import type { AxiosInstance } from 'axios';

  import type { DataOf } from '../../shared/data_of';
  import { createSessionStore } from '../util/session_store';
  import { TaxonRank, taxonRanks, TaxonSpec } from '../../shared/taxa';
  import {
    InteractiveTreeFlags,
    InteractiveTreeNode
  } from '../components/InteractiveTree.svelte';
  import { client } from './client';

  export const CONTAINS_INCLUDED_TAXA_FLAG = 1 << 15;
  export const COLLECTED_LEAF_FLAG = 1 << 31;

  export interface TaxonNode extends InteractiveTreeNode {
    taxonSpec: TaxonSpec;
    children: TaxonNode[] | null;
  }

  export const selectedTaxa = createSessionStore<SelectedTaxa | null>(
    'selected_taxa',
    null,
    (obj) => (obj ? new SelectedTaxa(obj) : null)
  );

  const DEFAULT_EXCLUDED_NODE_FLAGS =
    InteractiveTreeFlags.Expanded |
    InteractiveTreeFlags.Selectable |
    InteractiveTreeFlags.IncludesDescendants;
  const DEFAULT_INCLUDED_NODE_FLAGS = InteractiveTreeFlags.Selectable;

  let currentClient: AxiosInstance;
  client.subscribe((newClient) => (currentClient = newClient));

  export class SelectedTaxa {
    // caution: this class gets JSON-serialized

    taxonSpecs: TaxonSpec[];
    treeRoot: TaxonNode;

    constructor(data: DataOf<SelectedTaxa>) {
      this.taxonSpecs = data.taxonSpecs;
      this.treeRoot = data.treeRoot;
    }

    dropSelectedTaxa() {
      this._dropSelectedTaxa(this.treeRoot);
      this.taxonSpecs = [];
      this._collectIncludedTaxa(this.treeRoot);
    }

    async loadIncludedTaxa(taxaNames: string[]): Promise<boolean> {
      if (taxaNames.length == 0) return false;
      const res = await currentClient.post<TaxonSpec[]>('api/taxa/get', taxaNames);
      const taxa = res.data;
      if (taxa.length == 0) return false;

      const rootName = taxa[0].containingNames!.split(',')[0];
      this.treeRoot = {
        taxonSpec: {
          rank: TaxonRank.Kingdom,
          name: rootName,
          unique: rootName,
          author: null,
          containingNames: ''
        },
        nodeFlags: DEFAULT_EXCLUDED_NODE_FLAGS,
        nodeHTML: '(NEVER DISPLAYED)',
        children: null
      };
      for (const taxon of res.data) {
        const parent = this._addAncestors(this.treeRoot, taxon);
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push({
          taxonSpec: {
            rank: taxon.rank,
            name: taxon.name,
            unique: taxon.unique,
            author: taxon.author,
            containingNames: taxon.containingNames
          },
          nodeFlags: DEFAULT_INCLUDED_NODE_FLAGS,
          nodeHTML: this._formatIncludedTaxon(taxon.rank, taxon.name, taxon.author),
          children: null
        });
      }
      return true;
    }

    // Saves to sessionStore
    save() {
      selectedTaxa.set(this);
    }

    _addAncestors(rootNode: TaxonNode, taxon: TaxonSpec): TaxonNode {
      const ancestorNames = taxon.containingNames!.split('|');
      let parent = rootNode;
      for (let i = 1; i < ancestorNames.length; ++i) {
        let nextParent: TaxonNode | null = null;
        if (parent.children) {
          for (const child of parent.children) {
            if (child.taxonSpec.name == ancestorNames[i]) {
              nextParent = child;
              break;
            }
          }
        } else {
          parent.children = [];
        }
        if (!nextParent) {
          const rank = taxonRanks[i];
          const name = ancestorNames[i];
          nextParent = {
            taxonSpec: {
              rank,
              name,
              unique: name,
              author: null,
              containingNames: ancestorNames.slice(0, i).join('|')
            },
            nodeFlags: DEFAULT_EXCLUDED_NODE_FLAGS,
            nodeHTML: formatTaxonName(rank, name, null),
            children: null
          };
          parent.children.push(nextParent);
        }
        parent = nextParent;
      }
      return parent;
    }

    private _collectIncludedTaxa(fromNode: TaxonNode) {
      if (fromNode.children) {
        fromNode.children.forEach((child) => this._collectIncludedTaxa(child));
      } else {
        // the leaf nodes are the included taxa
        this.taxonSpecs.push(fromNode.taxonSpec);
      }
    }

    private _dropSelectedTaxa(fromNode: TaxonNode) {
      if (!fromNode.children) return;
      let i = 0;
      while (i < fromNode.children.length) {
        const child = fromNode.children[i];
        if (child.nodeFlags & InteractiveTreeFlags.Selected) {
          fromNode.children.splice(i, 1);
        } else {
          this._dropSelectedTaxa(child);
          ++i;
        }
      }
    }

    private _formatIncludedTaxon(rank: TaxonRank, name: string, author: string | null) {
      return `<span class="selection">${formatTaxonName(rank, name, author)}</span>`;
    }
  }

  export function formatTaxonName(
    rank: TaxonRank,
    name: string,
    author: string | null
  ): string {
    let html = '';
    if (![TaxonRank.Species, TaxonRank.Subspecies].includes(rank)) {
      html = `<span class="taxon-rank">${rank}:</span> `;
    }
    if ([TaxonRank.Genus, TaxonRank.Species, TaxonRank.Subspecies].includes(rank)) {
      name = `<i>${name}</i>`;
    }
    html += `<span class="taxon-name">${name}</span>`;
    if (author) {
      html += ` <span class="taxon-author">${author}</span>`;
    }
    return html;
  }
</script>
