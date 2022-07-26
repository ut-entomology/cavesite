import type { TaxonPathSpec } from '../../shared/model';
import { TaxonCounter } from '../../shared/taxon_counter';
import { TaxonVisitCounter } from './taxon_visit_counter';

test('merge gradually lengthening taxon path specs', () => {
  let partial: Partial<TaxonPathSpec> = {};
  const counter = TaxonCounter.createFromPathSpec(
    toPathSpec(partial),
    null,
    null,
    null
  );
  const vCounter = new TaxonVisitCounter(
    TaxonVisitCounter.addInitialVisits(counter, counter)
  );
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[1], [], [], [], [], [], [], []]);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[2], [], [], [], [], [], [], []]);

  partial.phylumName = 'Arthropoda';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[3], [1], [], [], [], [], [], []]);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[4], [2], [], [], [], [], [], []]);

  partial.className = 'Arachnida';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[5], [3], [1], [], [], [], [], []]);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[6], [4], [2], [], [], [], [], []]);

  partial.orderName = 'Araneae';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[7], [5], [3], [1], [], [], [], []]);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[8], [6], [4], [2], [], [], [], []]);

  partial.familyName = 'Thomisidae';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[9], [7], [5], [3], [1], [], [], []]);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[10], [8], [6], [4], [2], [], [], []]);

  partial.genusName = 'Xysticus';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[11], [9], [7], [5], [3], [1], [], []]);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[12], [10], [8], [6], [4], [2], [], []]);

  partial.speciesName = 'funestus';
  counter.updateForPathSpec(toPathSpec(partial), 'Xysticus funestus', null);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[13], [11], [9], [7], [5], [3], [1], []]);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[14], [12], [10], [8], [6], [4], [2], []]);

  partial.subspeciesName = 'madeup';
  counter.updateForPathSpec(
    toPathSpec(partial),
    'Xysticus funestus',
    'Xysticus funestus madeup'
  );
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[15], [13], [11], [9], [7], [5], [3], [1]]);
  vCounter.mergeCounter(counter);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[16], [14], [12], [10], [8], [6], [4], [2]]);
});

test('adding sibling taxa at each rank', () => {
  let partial1: Partial<TaxonPathSpec> = {};
  let partial2: Partial<TaxonPathSpec> = {};
  let counter1 = TaxonCounter.createFromPathSpec(
    toPathSpec(partial1),
    null,
    null,
    null
  );
  let counter2 = TaxonCounter.createFromPathSpec(
    toPathSpec(partial2),
    null,
    null,
    null
  );
  const vCounter = new TaxonVisitCounter(
    TaxonVisitCounter.addInitialVisits(counter1, counter1)
  );
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[1], [], [], [], [], [], [], []]);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[2], [], [], [], [], [], [], []]);

  partial2.phylumName = 'Mollusca';
  partial1.phylumName = 'Arthropoda';
  counter1 = TaxonCounter.createFromPathSpec(toPathSpec(partial1), null, null, null);
  vCounter.mergeCounter(counter1);
  expect(vCounter.getSpeciesCount()).toEqual(1);
  checkVisits(vCounter, [[3], [1], [], [], [], [], [], []]);
  counter2 = TaxonCounter.createFromPathSpec(toPathSpec(partial2), null, null, null);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(2);
  checkVisits(vCounter, [[4], [1, 1], [], [], [], [], [], []]);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(2);
  checkVisits(vCounter, [[5], [1, 2], [], [], [], [], [], []]);

  partial2 = Object.assign({ className: 'Insecta' }, partial1);
  partial1.className = 'Arachnida';
  counter1 = TaxonCounter.createFromPathSpec(toPathSpec(partial1), null, null, null);
  vCounter.mergeCounter(counter1);
  expect(vCounter.getSpeciesCount()).toEqual(2);
  checkVisits(vCounter, [[6], [2, 2], [1], [], [], [], [], []]);
  counter2 = TaxonCounter.createFromPathSpec(toPathSpec(partial2), null, null, null);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(3);
  checkVisits(vCounter, [[7], [3, 2], [1, 1], [], [], [], [], []]);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(3);
  checkVisits(vCounter, [[8], [4, 2], [1, 2], [], [], [], [], []]);

  partial2 = Object.assign({ orderName: 'Ixodida' }, partial1);
  partial1.orderName = 'Araneae';
  counter1 = TaxonCounter.createFromPathSpec(toPathSpec(partial1), null, null, null);
  vCounter.mergeCounter(counter1);
  expect(vCounter.getSpeciesCount()).toEqual(3);
  checkVisits(vCounter, [[9], [5, 2], [2, 2], [1], [], [], [], []]);
  counter2 = TaxonCounter.createFromPathSpec(toPathSpec(partial2), null, null, null);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(4);
  checkVisits(vCounter, [[10], [6, 2], [3, 2], [1, 1], [], [], [], []]);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(4);
  checkVisits(vCounter, [[11], [7, 2], [4, 2], [1, 2], [], [], [], []]);

  partial2 = Object.assign({ familyName: 'Ixodida' }, partial1);
  partial1.familyName = 'Theridiidae';
  counter1 = TaxonCounter.createFromPathSpec(toPathSpec(partial1), null, null, null);
  vCounter.mergeCounter(counter1);
  expect(vCounter.getSpeciesCount()).toEqual(4);
  checkVisits(vCounter, [[12], [8, 2], [5, 2], [2, 2], [1], [], [], []]);
  counter2 = TaxonCounter.createFromPathSpec(toPathSpec(partial2), null, null, null);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(5);
  checkVisits(vCounter, [[13], [9, 2], [6, 2], [3, 2], [1, 1], [], [], []]);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(5);
  checkVisits(vCounter, [[14], [10, 2], [7, 2], [4, 2], [1, 2], [], [], []]);

  partial2 = Object.assign({ genusName: 'Steatoda' }, partial1);
  partial1.genusName = 'Latrodectus';
  counter1 = TaxonCounter.createFromPathSpec(toPathSpec(partial1), null, null, null);
  vCounter.mergeCounter(counter1);
  expect(vCounter.getSpeciesCount()).toEqual(5);
  checkVisits(vCounter, [[15], [11, 2], [8, 2], [5, 2], [2, 2], [1], [], []]);
  counter2 = TaxonCounter.createFromPathSpec(toPathSpec(partial2), null, null, null);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(6);
  checkVisits(vCounter, [[16], [12, 2], [9, 2], [6, 2], [3, 2], [1, 1], [], []]);
  vCounter.mergeCounter(counter1); // test re-adding first counter
  expect(vCounter.getSpeciesCount()).toEqual(6);
  checkVisits(vCounter, [[17], [13, 2], [10, 2], [7, 2], [4, 2], [2, 1], [], []]);

  partial2 = Object.assign({ speciesName: 'triangulosa' }, partial1);
  partial1.speciesName = 'mactans';
  counter1 = TaxonCounter.createFromPathSpec(
    toPathSpec(partial1),
    null,
    'Latrodectus mactans',
    null
  );
  vCounter.mergeCounter(counter1);
  expect(vCounter.getSpeciesCount()).toEqual(6);
  checkVisits(vCounter, [[18], [14, 2], [11, 2], [8, 2], [5, 2], [3, 1], [1], []]);
  counter2 = TaxonCounter.createFromPathSpec(
    toPathSpec(partial2),
    null,
    'Steatoda triangulosa',
    null
  );
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(7);
  checkVisits(vCounter, [[19], [15, 2], [12, 2], [9, 2], [6, 2], [4, 1], [1, 1], []]);
  vCounter.mergeCounter(counter1);
  expect(vCounter.getSpeciesCount()).toEqual(7);
  checkVisits(vCounter, [[20], [16, 2], [13, 2], [10, 2], [7, 2], [5, 1], [2, 1], []]);

  partial2 = Object.assign({ subspeciesName: 'madeup2' }, partial1);
  partial1.subspeciesName = 'madeup1';
  counter1 = TaxonCounter.createFromPathSpec(
    toPathSpec(partial1),
    null,
    'Latrodectus mactans',
    'Latrodectus mactans madeup1'
  );
  vCounter.mergeCounter(counter1);
  expect(vCounter.getSpeciesCount()).toEqual(7);
  checkVisits(vCounter, [[21], [17, 2], [14, 2], [11, 2], [8, 2], [6, 1], [3, 1], [1]]);
  counter2 = TaxonCounter.createFromPathSpec(
    toPathSpec(partial2),
    null,
    'Latrodectus mactans',
    'Latrodectus mactans madeup2'
  );
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(8);
  checkVisits(vCounter, [
    [22],
    [18, 2],
    [15, 2],
    [12, 2],
    [9, 2],
    [7, 1],
    [4, 1],
    [1, 1]
  ]);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(8);
  checkVisits(vCounter, [
    [23],
    [19, 2],
    [16, 2],
    [13, 2],
    [10, 2],
    [8, 1],
    [5, 1],
    [1, 2]
  ]);
});

test('adding multiple taxa at once', () => {
  let partial1: Partial<TaxonPathSpec> = {
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Theridiidae',
    genusName: 'Latrodectus'
  };
  let partial2: Partial<TaxonPathSpec> = {
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Theridiidae',
    genusName: 'Steatoda'
  };
  let counter1 = TaxonCounter.createFromPathSpec(
    toPathSpec(partial1),
    null,
    null,
    null
  );
  counter1.updateForPathSpec(toPathSpec(partial2), null, null);

  let partial3: Partial<TaxonPathSpec> = {
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Theridiidae',
    genusName: 'Latrodectus',
    speciesName: 'mactans'
  };
  let partial4: Partial<TaxonPathSpec> = {
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Theridiidae',
    genusName: 'Latrodectus',
    speciesName: 'hesperus'
  };
  let partial5: Partial<TaxonPathSpec> = {
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Theridiidae',
    genusName: 'Argyrodes',
    speciesName: 'elevatus'
  };
  let counter2 = TaxonCounter.createFromPathSpec(
    toPathSpec(partial3),
    null,
    'Latrodectus mactans',
    null
  );
  counter2.updateForPathSpec(toPathSpec(partial4), 'Latrodectus hesperus', null);
  counter2.updateForPathSpec(toPathSpec(partial5), 'Argyrodes elevatus', null);

  const vCounter = new TaxonVisitCounter(
    TaxonVisitCounter.addInitialVisits(counter1, counter1)
  );
  expect(vCounter.getSpeciesCount()).toEqual(2);
  checkVisits(vCounter, [[1], [1], [1], [1], [1], [1, 1], [], []]);
  vCounter.mergeCounter(counter2);
  expect(vCounter.getSpeciesCount()).toEqual(4);
  checkVisits(vCounter, [[2], [2], [2], [2], [2], [2, 1, 1], [1, 1, 1], []]);
});

function checkVisits(vCounter: TaxonVisitCounter, visits: number[][]): void {
  const nullIfEmpty = (counts: number[]) => (counts.length == 0 ? null : counts);
  expect(vCounter.kingdomVisits).toEqual(nullIfEmpty(visits[0]));
  expect(vCounter.phylumVisits).toEqual(nullIfEmpty(visits[1]));
  expect(vCounter.classVisits).toEqual(nullIfEmpty(visits[2]));
  expect(vCounter.orderVisits).toEqual(nullIfEmpty(visits[3]));
  expect(vCounter.familyVisits).toEqual(nullIfEmpty(visits[4]));
  expect(vCounter.genusVisits).toEqual(nullIfEmpty(visits[5]));
  expect(vCounter.speciesVisits).toEqual(nullIfEmpty(visits[6]));
  expect(vCounter.subspeciesVisits).toEqual(nullIfEmpty(visits[7]));
}

function toPathSpec(partialSpec: Partial<TaxonPathSpec>): TaxonPathSpec {
  return Object.assign(
    {
      kingdomName: 'Animalia',
      phylumName: null,
      className: null,
      orderName: null,
      familyName: null,
      genusName: null,
      speciesName: null,
      subspeciesName: null
    },
    partialSpec
  );
}
