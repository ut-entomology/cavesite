import { SelectionsTree, Spec } from './selections_tree';

class TestSpec implements Spec {
  unique: string;
  containingSpecs: TestSpec[];

  constructor(unique: string, containingSpecs: TestSpec[] = []) {
    this.unique = unique;
    this.containingSpecs = containingSpecs;
  }
}

class TestTree extends SelectionsTree<TestSpec> {
  constructor(specs: TestSpec[]) {
    super(specs);
  }

  createContainingSpecs(forSpec: TestSpec): TestSpec[] {
    return forSpec.containingSpecs;
  }
}

test('creating and using an empty tree', () => {
  const tree = new TestTree([]);
  expect(tree.getRootNode()).toBeNull();
  expect(tree.getSelections()).toEqual([]);
  expect(tree.isSelected('A')).toBe(false);
});

test('adding and removing a root element', () => {
  const tree = new TestTree([]);
  const spec1 = new TestSpec('A');
  tree.addSelection(spec1, true);
  expect(tree.getRootNode()).toEqual({ spec: spec1, children: [] });
  expect(tree.getSelections()).toEqual(['A']);
  expect(tree.isSelected('A')).toBe(true);

  tree.removeSelection([{ spec: spec1, children: [] }]);
  expect(tree.getRootNode()).toBeNull();
  expect(tree.getSelections()).toEqual([]);
  expect(tree.isSelected('A')).toBe(false);
});
