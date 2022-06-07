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
const specAAAA = new TestSpec('AAAA', [specA, specAA, specAAA]);
const specAAB = new TestSpec('AAB', [specA, specAA]);
const specAABA = new TestSpec('AABA', [specA, specAA, specAAB]);
const specAB = new TestSpec('AB', [specA]);
const specABA = new TestSpec('ABA', [specA, specAB]);
const specABB = new TestSpec('ABB', [specA, specAB]);
const specABAA = new TestSpec('ABAA', [specA, specAB, specABA]);
const specABAB = new TestSpec('ABAB', [specA, specAB, specABA]);

test('creating and using an empty tree', () => {
  const tree = new TestTree([]);
  expect(tree.getRootNode()).toBeNull();
  expect(tree.getSelections()).toEqual([]);
  expect(tree.getSelectionSpecs()).toEqual({});
  expect(tree.isSelected('A')).toBe(false);
});

test('adding and removing a root element', () => {
  const tree = new TestTree([]);
  tree.addSelection(specA);
  expect(tree.getRootNode()).toEqual({ spec: specA, children: [], expanded: true });
  expect(tree.getSelections()).toEqual(['A']);
  expect(tree.getSelectionSpecs()).toEqual({ A: specA });
  expect(tree.isSelected('A')).toBe(true);

  tree.removeSelection([], specA);
  expect(tree.getRootNode()).toBeNull();
  expect(tree.getSelections()).toEqual([]);
  expect(tree.getSelectionSpecs()).toEqual({});
  expect(tree.isSelected('A')).toBe(false);
});

test('adding and removing 2-deep nested elements', () => {
  const tree = new TestTree([]);
  tree.addSelection(specA);

  tree.addSelection(specAA);
  expect(tree.getRootNode()).toEqual({
    spec: specA,
    children: [{ spec: specAA, children: [], expanded: true }],
    expanded: true
  });
  expect(tree.getSelections()).toEqual(['AA']);
  expect(tree.getSelectionSpecs()).toEqual({ AA: specAA });
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(true);

  tree.addSelection(specAB);
  expect(tree.getRootNode()).toEqual({
    spec: specA,
    children: [
      { spec: specAA, children: [], expanded: true },
      { spec: specAB, children: [], expanded: true }
    ],
    expanded: true
  });
  expect(tree.getSelections()).toEqual(['AA', 'AB']);
  expect(tree.getSelectionSpecs()).toEqual({ AA: specAA, AB: specAB });
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(true);
  expect(tree.isSelected('AB')).toBe(true);

  tree.removeSelection([{ spec: specA, children: [specAB] }], specAB);
  expect(tree.getSelections()).toEqual(['AA']);
  expect(tree.getSelectionSpecs()).toEqual({ AA: specAA });
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(true);
  expect(tree.isSelected('AB')).toBe(false);

  tree.removeSelection([{ spec: specA, children: [specAA] }], specAA);
  expect(tree.getSelections()).toEqual([]);
  expect(tree.getSelectionSpecs()).toEqual({});
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
          { spec: specAAA, children: [], expanded: true },
          { spec: specAAB, children: [], expanded: true }
        ],
        expanded: true
      },
      {
        spec: specAB,
        children: [{ spec: specABA, children: [], expanded: true }],
        expanded: true
      }
    ],
    expanded: true
  });

  expect(tree.getSelections().sort()).toEqual(['AAA', 'AAB', 'ABA']);
  expect(tree.getSelectionSpecs()).toEqual({
    AAA: specAAA,
    AAB: specAAB,
    ABA: specABA
  });
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
  expect(tree.getSelectionSpecs()).toEqual({ AAA: specAAA, AAB: specAAB });
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
  expect(tree.getSelectionSpecs()).toEqual({ AAB: specAAB });
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
  expect(tree.getSelectionSpecs()).toEqual({});
  expect(tree.isSelected('A')).toBe(false);
  expect(tree.isSelected('AA')).toBe(false);
  expect(tree.isSelected('AAA')).toBe(false);
  expect(tree.isSelected('AAB')).toBe(false);
});

test('initializing from constructor and adding ancestors of selections', () => {
  const tree = new TestTree([specAAA, specAABA, specABA]);

  expect(tree.getRootNode()).toEqual({
    spec: specA,
    children: [
      {
        spec: specAA,
        children: [
          { spec: specAAA, children: [], expanded: true },
          {
            spec: specAAB,
            children: [{ spec: specAABA, children: [], expanded: true }],
            expanded: true
          }
        ],
        expanded: true
      },
      {
        spec: specAB,
        children: [{ spec: specABA, children: [], expanded: true }],
        expanded: true
      }
    ],
    expanded: true
  });

  tree.addSelection(specAB);
  expect(tree.getSelections().sort()).toEqual(['AAA', 'AABA', 'AB']);
  expect(tree.getSelectionSpecs()).toEqual({
    AAA: specAAA,
    AABA: specAABA,
    AB: specAB
  });

  tree.addSelection(specAA);
  expect(tree.getSelections().sort()).toEqual(['AA', 'AB']);
  expect(tree.getSelectionSpecs()).toEqual({ AA: specAA, AB: specAB });

  tree.addSelection(specA);
  expect(tree.getSelections().sort()).toEqual(['A']);
  expect(tree.getSelectionSpecs()).toEqual({ A: specA });
});

test('Removing implied selections one level down', () => {
  const tree = new TestTree([specAA, specAB]);

  tree.removeSelection(
    [
      { spec: specA, children: [specAA] },
      { spec: specAA, children: [specAAA] }
    ],
    specAAA
  );
  expect(tree.getSelections().sort()).toEqual(['AB']);
  expect(tree.getSelectionSpecs()).toEqual({ AB: specAB });

  tree.removeSelection(
    [
      { spec: specA, children: [specAB] },
      { spec: specAB, children: [specABA, specABB] }
    ],
    specABB
  );
  expect(tree.getSelections().sort()).toEqual(['ABA']);
  expect(tree.getSelectionSpecs()).toEqual({ ABA: specABA });
});

test('Removing implied selections two levels down', () => {
  const tree = new TestTree([specAA, specAB]);

  tree.removeSelection(
    [
      { spec: specA, children: [specAA] },
      { spec: specAA, children: [specAAA] },
      { spec: specAAA, children: [specAAAA] }
    ],
    specAAAA
  );
  expect(tree.getSelections().sort()).toEqual(['AB']);
  expect(tree.getSelectionSpecs()).toEqual({ AB: specAB });

  tree.removeSelection(
    [
      { spec: specA, children: [specAB] },
      { spec: specAB, children: [specABA, specABB] },
      { spec: specABA, children: [specABAA, specABAB] }
    ],
    specABAB
  );
  expect(tree.getSelections().sort()).toEqual(['ABAA', 'ABB']);
  expect(tree.getSelectionSpecs()).toEqual({ ABAA: specABAA, ABB: specABB });
});

test('Removing selections without implied children', () => {
  const tree = new TestTree([specAAB, specABAB]);

  tree.removeSelection(
    [
      { spec: specA, children: [] },
      { spec: specAB, children: [] },
      { spec: specABA, children: [] }
    ],
    specABAB
  );
  expect(tree.getSelections().sort()).toEqual(['AAB']);
  expect(tree.getSelectionSpecs()).toEqual({ AAB: specAAB });

  tree.removeSelection(
    [
      { spec: specA, children: [] },
      { spec: specAA, children: [] }
    ],
    specAAB
  );
  expect(tree.getSelections().sort()).toEqual([]);
  expect(tree.getSelectionSpecs()).toEqual({});
});
