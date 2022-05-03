<script lang="ts" context="module">
  // External to this module, the taxa that this module ultimately selects are
  // called "selected" taxa. Internal to the module, these are called "included"
  // taxa, because "selected" taxa are those with checked checkboxes.

  import type { AxiosInstance } from 'axios';

  import type { DataOf } from '../../shared/data_of';
  import { createSessionStore } from '../util/session_store';
  import { TaxonRank, taxonRanks } from '../../shared/model';
  import type { TaxonInfo } from '../../backend/apis/taxa_api';
  import {
    InteractiveTreeFlags,
    InteractiveTreeNode
  } from '../components/InteractiveTree.svelte';
  import { client } from './client';

  export const CONTAINS_INCLUDED_TAXA_FLAG = 1 << 15;
  export const COLLECTED_LEAF_FLAG = 1 << 31;

  export interface TaxonNode extends InteractiveTreeNode {
    id: number;
    rank: TaxonRank;
    name: string;
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

    // only taxa names are guaranteed to survive GBIF downloads
    taxonIDs: number[]; // TODO: don't even keep IDs
    taxonNames: string[];
    authors: string[];
    treeRoot: TaxonNode;

    constructor(data: DataOf<SelectedTaxa>) {
      this.taxonNames = data.taxonNames;
      this.taxonIDs = data.taxonIDs;
      this.authors = data.authors;
      this.treeRoot = data.treeRoot;
    }

    dropSelectedTaxa() {
      this._dropSelectedTaxa(this.treeRoot);
      this.taxonIDs = [];
      this.taxonNames = [];
      this.authors = [];
      this._collectIncludedTaxa(this.treeRoot);
    }

    async loadIncludedTaxa(taxaNames: string[]): Promise<boolean> {
      if (taxaNames.length == 0) return false;
      const res = await currentClient.post<TaxonInfo[]>('api/taxa/get', taxaNames);
      const taxa = res.data;
      if (taxa.length == 0) return false;

      this.treeRoot = {
        // root is top-most parent ID of any taxon
        id: parseInt(taxa[0].parentIDSeries.split(',')[0]),
        rank: TaxonRank.Kingdom,
        name: taxa[0].parentNameSeries.split(',')[0],
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
          id: taxon.taxonID,
          rank: taxon.taxonRank,
          name: taxon.taxonName,
          nodeFlags: DEFAULT_INCLUDED_NODE_FLAGS,
          nodeHTML: this._formatIncludedTaxon(
            taxon.taxonRank,
            taxon.taxonName,
            taxon.author
          ),
          children: null
        });
      }
      return true;
    }

    // Saves to sessionStore
    save() {
      selectedTaxa.set(this);
    }

    _addAncestors(rootNode: TaxonNode, taxon: TaxonInfo): TaxonNode {
      const parentIDs = taxon.parentIDSeries.split(',').map((idStr) => parseInt(idStr));
      const parentNames = taxon.parentNameSeries.split('|');
      let parent = rootNode;
      for (let i = 1; i < parentIDs.length; ++i) {
        let nextParent: TaxonNode | null = null;
        if (parent.children) {
          for (const child of parent.children) {
            if (child.id == parentIDs[i]) {
              nextParent = child;
              break;
            }
          }
        } else {
          parent.children = [];
        }
        if (!nextParent) {
          const rank = taxonRanks[i];
          const name = parentNames[i];
          nextParent = {
            id: parentIDs[i],
            rank,
            name,
            nodeFlags: DEFAULT_EXCLUDED_NODE_FLAGS,
            nodeHTML: this._formatTaxonName(rank, name, null),
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
        this.taxonIDs.push(fromNode.id);
        this.taxonNames.push(fromNode.name);
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

    private _formatTaxonName(
      rank: TaxonRank,
      name: string,
      author: string | null
    ): string {
      let html = rank != TaxonRank.Species ? rank + ': ' : '';
      if ([TaxonRank.Genus, TaxonRank.Species, TaxonRank.Subspecies].includes(rank)) {
        html += `<i>${name}</i>`;
      } else {
        html += name;
      }
      if (author) {
        html += ' ' + author;
      }
      return html;
    }

    private _formatIncludedTaxon(rank: TaxonRank, name: string, author: string | null) {
      return `<span>${this._formatTaxonName(rank, name, author)}</span>`;
    }
  }
</script>
