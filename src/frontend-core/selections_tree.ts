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
  private _selectionSpecsByUnique: Record<string, S> | null = null;

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

    this._selectionSpecsByUnique = null; // invalidate cached selections
  }

  getRootNode(): TreeNode<S> | null {
    return this._rootNode;
  }

  getSelections(): string[] {
    this._setDerivedValues();
    return Object.keys(this._selectionSpecsByUnique!);
  }

  getSelectionSpecs(): Record<string, S> {
    this._setDerivedValues();
    return this._selectionSpecsByUnique!;
  }

  isSelected(unique: string): boolean {
    this._setDerivedValues();
    return this._selectionSpecsByUnique![unique] !== undefined;
  }

  removeSelection(containingSpecs: SpecEntry<S>[], spec: S): void {
    if (!this._rootNode)
      throw Error('Attempted to remove from an empty set of selections');
    if (containingSpecs.length == 0) {
      this._rootNode = null;
    } else {
      this._removeFromNode(this._rootNode, containingSpecs.slice(), spec);
      if (this._rootNode.children.length == 0) {
        this._rootNode = null;
      }
    }
    this._selectionSpecsByUnique = null; // invalidate cached selections
  }

  private _nodeSorter(n1: TreeNode<S>, n2: TreeNode<S>) {
    return n1.spec.unique < n2.spec.unique ? -1 : 1;
  }

  private _removeChild(fromNode: TreeNode<S>, nextChildSpec: S) {
    const childUnique = nextChildSpec.unique;
    const childIndex = fromNode.children.findIndex((c) => c.spec.unique == childUnique);
    if (childIndex >= 0) {
      fromNode.children.splice(childIndex, 1);
    }
  }

  private _removeFromNode(
    containingNode: TreeNode<S>,
    containingSpecs: SpecEntry<S>[],
    leafSpecToRemove: S
  ): void {
    const containingSpec = containingSpecs.shift()!;
    const addImpliedChildren = containingNode.children.length == 0;
    let nextChildSpec = leafSpecToRemove;

    if (containingSpecs.length == 0) {
      this._removeChild(containingNode, leafSpecToRemove);
    } else {
      nextChildSpec = containingSpecs[0].spec;
      const removedChildUnique = nextChildSpec.unique;
      let childNode = containingNode.children.find(
        (c) => c.spec.unique == removedChildUnique
      );
      if (!childNode) {
        childNode = { spec: nextChildSpec, children: [] };
        containingNode.children.push(childNode);
      }
      this._removeFromNode(childNode, containingSpecs, leafSpecToRemove);
      if (childNode.children.length == 0) {
        this._removeChild(containingNode, nextChildSpec);
      }
    }
    if (addImpliedChildren) {
      const removedChildUnique = nextChildSpec.unique;
      for (const childSpec of containingSpec.children) {
        if (childSpec.unique != removedChildUnique) {
          containingNode.children.push({ spec: childSpec, children: [] });
        }
      }
      containingNode.children.sort();
    }
  }

  private _setDerivedValues() {
    if (this._selectionSpecsByUnique === null) {
      this._selectionSpecsByUnique = {};
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
      this._selectionSpecsByUnique![unique] = node.spec;
    } else {
      node.children.forEach((child) => this._tallyNode(child));
    }
  }
}
