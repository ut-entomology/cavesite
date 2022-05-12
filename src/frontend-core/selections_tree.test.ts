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

  getContainingSpecs(forSpec: TestSpec): TestSpec[] {
    return forSpec.containingSpecs;
  }
}

const specA = new TestSpec('A');
const specAA = new TestSpec('AA', [specA]);
const specAAA = new TestSpec('AAA', [specA, specAA]);
const specAAB = new TestSpec('AAB', [specA, specAA]);
const specAB = new TestSpec('AB', [specA]);
const specABA = new TestSpec('ABA', [specA, specAB]);

test('creating and using an empty tree', () => {
  const tree = new TestTree([]);
  expect(tree.getRootNode()).toBeNull();
  expect(tree.getSelections()).toEqual([]);
  expect(tree.isSelected('A')).toBe(false);
});

test('adding and removing a root element', () => {
  const tree = new TestTree([]);
  tree.addSelection(specA);
  expect(tree.getRootNode()).toEqual({ spec: specA, children: [] });
  expect(tree.getSelections()).toEqual(['A']);
  expect(tree.isSelected('A')).toBe(true);

  tree.removeSelection([], specA);
  expect(tree.getRootNode()).toBeNull();
  expect(tree.getSelections()).toEqual([]);
  expect(tree.isSelected('A')).toBe(false);
});

test('adding and removing 2-deep nested elements', () => {
  const tree = new TestTree([]);
  tree.addSelection(specA);

  tree.addSelection(specAA);
  expect(tree.getRootNode()).toEqual({
    spec: specA,
    children: [{ spec: specAA, children: [] }]
  });
  expect(tree.getSelections()).toEqual(['AA']);
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(true);

  tree.addSelection(specAB);
  expect(tree.getRootNode()).toEqual({
    spec: specA,
    children: [
      { spec: specAA, children: [] },
      { spec: specAB, children: [] }
    ]
  });
  expect(tree.getSelections()).toEqual(['AA', 'AB']);
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(true);
  expect(tree.isSelected('AB')).toBe(true);

  tree.removeSelection([{ spec: specA, children: [specAB] }], specAB);
  expect(tree.getSelections()).toEqual(['AA']);
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(true);
  expect(tree.isSelected('AB')).toBe(false);

  tree.removeSelection([{ spec: specA, children: [specAA] }], specAA);
  expect(tree.getSelections()).toEqual([]);
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(false);
  expect(tree.isSelected('AB')).toBe(false);
});

test('adding and removing 3-deep nested elements', () => {
  const tree = new TestTree([]);
  tree.addSelection(specAA);
  tree.addSelection(specAAB);
  tree.addSelection(specAAA);
  tree.addSelection(specABA);

  expect(tree.getRootNode()).toEqual({
    spec: specA,
    children: [
      {
        spec: specAA,
        children: [
          { spec: specAAA, children: [] },
          { spec: specAAB, children: [] }
        ]
      },
      { spec: specAB, children: [{ spec: specABA, children: [] }] }
    ]
  });

  expect(tree.getSelections().sort()).toEqual(['AAA', 'AAB', 'ABA']);
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(false);
  expect(tree.isSelected('AAA')).toBe(true);
  expect(tree.isSelected('AAB')).toBe(true);
  expect(tree.isSelected('AB')).toBe(false);
  expect(tree.isSelected('ABA')).toBe(true);

  tree.removeSelection(
    [
      { spec: specA, children: [specAB] },
      { spec: specAB, children: [specABA] }
    ],
    specABA
  );
  expect(tree.getSelections().sort()).toEqual(['AAA', 'AAB']);
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(false);
  expect(tree.isSelected('AAA')).toBe(true);
  expect(tree.isSelected('AAB')).toBe(true);
  expect(tree.isSelected('AB')).toBe(false);
  expect(tree.isSelected('ABA')).toBe(false);

  tree.removeSelection(
    [
      { spec: specA, children: [specAA] },
      { spec: specAA, children: [specAAA, specAAB] }
    ],
    specAAA
  );
  expect(tree.getSelections()).toEqual(['AAB']);
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(false);
  expect(tree.isSelected('AAA')).toBe(false);
  expect(tree.isSelected('AAB')).toBe(true);

  tree.removeSelection(
    [
      { spec: specA, children: [specAA] },
      { spec: specAA, children: [specAAB] }
    ],
    specAAB
  );
  expect(tree.getSelections()).toEqual([]);
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(false);
  expect(tree.isSelected('AAA')).toBe(false);
  expect(tree.isSelected('AAB')).toBe(false);
});
