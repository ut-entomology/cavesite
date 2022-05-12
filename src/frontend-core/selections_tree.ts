/**
 * Class SelectionsTree represents a selection of hierarchical entities such
 * that each selection implicitly also selects all its containing entities.
 * The class provides an economical tree representation of these selections
 * by not including any implied selections within the tree.
 */

export interface Spec {
  unique: string;
}

export interface SpecEntry<S extends Spec> {
  spec: S;
  children: S[];
}

export interface TreeNode<S extends Spec> {
  spec: S;
  children: TreeNode<S>[];
}

export abstract class SelectionsTree<S extends Spec> {
  private _rootNode: TreeNode<S> | null = null;
  private _selectedUniques: string[] | null = null;
  private _selectionsByUnique: Record<string, boolean> = {};

  constructor(selectedSpecs: S[]) {
    selectedSpecs.forEach((spec) => this.addSelection(spec, false));
    if (this._rootNode) this._sortChildNodes(this._rootNode);
    this._setDerivedValues();
  }

  abstract getContainingSpecs(forSpec: S): S[];

  addSelection(forSpec: S, resort: boolean = true): void {
    const specs = this.getContainingSpecs(forSpec).slice();
    specs.push(forSpec); // now specs won't be empty

    const rootSpec = specs.shift()!;
    if (!this._rootNode || specs.length == 0) {
      this._rootNode = { spec: rootSpec, children: [] };
    }
    let node = this._rootNode;
    for (const spec of specs) {
      let nextNode = node.children.find((child) => child.spec.unique == spec.unique);
      if (!nextNode) {
        nextNode = { spec: spec, children: [] };
        node.children.push(nextNode);
        if (resort) node.children.sort(this._nodeSorter);
      } else if (nextNode.spec.unique == forSpec.unique) {
        nextNode.children = []; // childless nodes are the selections
        break; // this is redundant but clarifies behavior
      }
      node = nextNode;
    }

    this._selectedUniques = null; // invalidate cached selections
  }

  getRootNode(): TreeNode<S> | null {
    return this._rootNode;
  }

  getSelections(): string[] {
    this._setDerivedValues();
    return this._selectedUniques!;
  }

  isSelected(unique: string): boolean {
    this._setDerivedValues();
    return this._selectionsByUnique[unique] || false;
  }

  removeSelection(containingSpecs: SpecEntry<S>[], spec: S): void {
    if (!this._rootNode)
      throw Error('Attempted to remove from an empty set of selections');
    if (containingSpecs.length == 0) {
      this._rootNode = null;
    } else {
      this._removeFromNode(this._rootNode, containingSpecs, spec);
      if (this._rootNode.children.length == 0) {
        this._rootNode = null;
      }
    }
    this._selectedUniques = null; // invalidate cached selections
  }

  private _nodeSorter(n1: TreeNode<S>, n2: TreeNode<S>) {
    return n1.spec.unique < n2.spec.unique ? -1 : 1;
  }

  private _removeChild(fromNode: TreeNode<S>, parentSpec: SpecEntry<S>, childSpec: S) {
    const childUnique = childSpec.unique;
    const childIndex = fromNode.children.findIndex((c) => c.spec.unique == childUnique);
    if (childIndex >= 0) {
      fromNode.children.splice(childIndex, 1);
    } else {
      for (const childSpec of parentSpec.children) {
        if (childSpec.unique != childUnique) {
          fromNode.children.push({ spec: childSpec, children: [] });
        }
      }
      fromNode.children.sort();
    }
  }

  private _removeFromNode(
    containingNode: TreeNode<S>,
    containingSpecs: SpecEntry<S>[],
    specToRemove: S
  ): void {
    const containingSpec = containingSpecs.shift()!;

    if (containingSpecs.length > 0) {
      const childSpec = containingSpecs[0].spec;
      const childUnique = childSpec.unique;
      let childNode = containingNode.children.find((c) => c.spec.unique == childUnique);
      if (!childNode) {
        childNode = { spec: childSpec, children: [] };
        containingNode.children.push(childNode);
      }
      this._removeFromNode(childNode, containingSpecs, specToRemove);
      if (childNode.children.length == 0) {
        this._removeChild(containingNode, containingSpec, childSpec);
      }
    } else {
      this._removeChild(containingNode, containingSpec, specToRemove);
    }
  }

  private _setDerivedValues() {
    if (this._selectedUniques === null) {
      this._selectedUniques = [];
      this._selectionsByUnique = {};
      if (this._rootNode) {
        this._tallyNode(this._rootNode);
      }
    }
  }

  private _sortChildNodes(node: TreeNode<S>): void {
    node.children.sort(this._nodeSorter);
    node.children.forEach((child) => this._sortChildNodes(child));
  }

  private _tallyNode(node: TreeNode<S>): void {
    if (node.children.length == 0) {
      const unique = node.spec.unique;
      this._selectedUniques!.push(unique);
      this._selectionsByUnique[unique] = true;
    } else {
      node.children.forEach((child) => this._tallyNode(child));
    }
  }
}
