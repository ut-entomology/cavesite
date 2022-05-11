/**
 * Class SelectionsTree represents a selection of hierarchical entities such
 * that each selection implicitly also selects all its containing entities.
 * The class provides an economical tree representation of these selections
 * by not including any implied selections within the tree.
 */

export interface Spec {
  unique: string;
}

export interface PathEntry<S extends Spec> {
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

  removeSelection(pathToSpec: PathEntry<S>[]): void {
    // Walk the selection tree as close to the to-be-removed entity as possible.

    let parentNode: TreeNode<S> | null = null;
    let node = this._rootNode; // deepest matching node
    if (!node) throw Error('Attempted to remove from an empty set of selections');
    let nextNode: TreeNode<S> | null = node; // next node whose children are to be examined
    let pathIndex = 0; // index of next path entry to examine

    while (nextNode) {
      // The root node will match the first containing entity, when present.
      node = nextNode;
      nextNode = null;
      if (++pathIndex < pathToSpec.length) {
        const nextUnique = pathToSpec[pathIndex].spec.unique;
        nextNode =
          node.children.find((child) => child.spec.unique == nextUnique) || null;
        parentNode = node;
      }
    }
    if (node.children.length > 0) {
      throw Error('Attempted to remove an unimplied selection');
    }

    // If we walked the entire path, remove the entity for the last node of the path.

    if (pathIndex == pathToSpec.length) {
      if (parentNode === null) {
        this._rootNode = null;
      } else {
        const nodeIndex = parentNode.children.indexOf(node);
        parentNode.children.splice(nodeIndex, 1);
      }
    }

    // Add all children outside the path below the previously-selected entity, so that
    // removing an implied entity explicitly adds all previously implied entities but
    // the one to be removed, below the nearest explicitly selected entity.
    else {
      nextNode = node;
      while (pathIndex < pathToSpec.length) {
        const nextDeeperUnique = pathToSpec[pathIndex].spec.unique;
        node = nextNode;
        for (const child of pathToSpec[pathIndex - 1].children) {
          const childNode = { spec: child, children: [] };
          node.children.push(childNode);
          if (child.unique == nextDeeperUnique) {
            nextNode = childNode;
          }
        }
        node.children.sort(this._nodeSorter);
        ++pathIndex;
      }
    }

    this._selectedUniques = null; // invalidate cached selections
  }

  private _nodeSorter(n1: TreeNode<S>, n2: TreeNode<S>) {
    return n1.spec.unique < n2.spec.unique ? -1 : 1;
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
