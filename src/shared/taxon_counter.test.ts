import type { TaxonPathSpec } from './model';
import { TaxonCounter } from './taxon_counter';

test('gradually refining same taxon, twice', () => {
  let partial: Partial<TaxonPathSpec> = {};
  const counter = TaxonCounter.createFromPathSpec(
    toPathSpec(partial),
    null,
    null,
    null
  );
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.phylumName = 'Arthropoda';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.className = 'Arachnida';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.orderName = 'Araneae';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.familyName = 'Thomisidae';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.genusName = 'Xysticus';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.speciesName = 'funestus';
  counter.updateForPathSpec(toPathSpec(partial), 'Xysticus funestus', null);
  expect(counter.getSpeciesCount()).toEqual(1);
  counter.updateForPathSpec(toPathSpec(partial), 'Xysticus funestus', null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.subspeciesName = 'madeup';
  counter.updateForPathSpec(
    toPathSpec(partial),
    'Xysticus funestus',
    'Xysticus funestus madeup'
  );
  expect(counter.getSpeciesCount()).toEqual(1);
  counter.updateForPathSpec(
    toPathSpec(partial),
    'Xysticus funestus',
    'Xysticus funestus madeup'
  );
  expect(counter.getSpeciesCount()).toEqual(1);

  // second time

  partial = {};
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.phylumName = 'Arthropoda';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.className = 'Arachnida';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.orderName = 'Araneae';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.familyName = 'Thomisidae';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.genusName = 'Xysticus';
  counter.updateForPathSpec(toPathSpec(partial), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.speciesName = 'funestus';
  counter.updateForPathSpec(toPathSpec(partial), 'Xysticus funestus', null);
  expect(counter.getSpeciesCount()).toEqual(1);

  partial.subspeciesName = 'madeup';
  counter.updateForPathSpec(
    toPathSpec(partial),
    'Xysticus funestus',
    'Xysticus funestus madeup'
  );
  expect(counter.getSpeciesCount()).toEqual(1);
});

test('adding sibling taxa at each rank, twice', () => {
  let partial1: Partial<TaxonPathSpec> = {};
  let partial2: Partial<TaxonPathSpec> = {};
  const counter = TaxonCounter.createFromPathSpec(
    toPathSpec(partial1),
    null,
    null,
    null
  );
  expect(counter.getSpeciesCount()).toEqual(1);

  partial2.phylumName = 'Mollusca';
  partial1.phylumName = 'Arthropoda';
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(1);
  counter.updateForPathSpec(toPathSpec(partial2), null, null);
  expect(counter.getSpeciesCount()).toEqual(2);

  partial2 = Object.assign({ className: 'Insecta' }, partial1);
  partial1.className = 'Arachnida';
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(2);
  counter.updateForPathSpec(toPathSpec(partial2), null, null);
  expect(counter.getSpeciesCount()).toEqual(3);

  partial2 = Object.assign({ orderName: 'Ixodida' }, partial1);
  partial1.orderName = 'Araneae';
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(3);
  counter.updateForPathSpec(toPathSpec(partial2), null, null);
  expect(counter.getSpeciesCount()).toEqual(4);

  partial2 = Object.assign({ familyName: 'Ixodida' }, partial1);
  partial1.familyName = 'Theridiidae';
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(4);
  counter.updateForPathSpec(toPathSpec(partial2), null, null);
  expect(counter.getSpeciesCount()).toEqual(5);

  partial2 = Object.assign({ genusName: 'Steatoda' }, partial1);
  partial1.genusName = 'Latrodectus';
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(5);
  counter.updateForPathSpec(toPathSpec(partial2), null, null);
  expect(counter.getSpeciesCount()).toEqual(6);

  partial2 = Object.assign({ speciesName: 'triangulosa' }, partial1);
  partial1.speciesName = 'mactans';
  counter.updateForPathSpec(toPathSpec(partial1), 'Latrodectus mactans', null);
  expect(counter.getSpeciesCount()).toEqual(6);
  counter.updateForPathSpec(toPathSpec(partial2), 'Steatoda triangulosa', null);
  expect(counter.getSpeciesCount()).toEqual(7);

  partial2 = Object.assign({ subspeciesName: 'madeup2' }, partial1);
  partial1.subspeciesName = 'madeup1';
  counter.updateForPathSpec(
    toPathSpec(partial1),
    'Latrodectus mactans',
    'Latrodectus mactans madeup1'
  );
  expect(counter.getSpeciesCount()).toEqual(7);
  counter.updateForPathSpec(
    toPathSpec(partial2),
    'Latrodectus mactans',
    'Latrodectus mactans madeup2'
  );
  expect(counter.getSpeciesCount()).toEqual(8);

  // second time

  partial1 = {};
  partial2 = {};
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);

  partial2.phylumName = 'Mollusca';
  partial1.phylumName = 'Arthropoda';
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);
  counter.updateForPathSpec(toPathSpec(partial2), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);

  partial2 = Object.assign({ className: 'Insecta' }, partial1);
  partial1.className = 'Arachnida';
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);
  counter.updateForPathSpec(toPathSpec(partial2), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);

  partial2 = Object.assign({ orderName: 'Ixodida' }, partial1);
  partial1.orderName = 'Araneae';
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);
  counter.updateForPathSpec(toPathSpec(partial2), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);

  partial2 = Object.assign({ familyName: 'Ixodida' }, partial1);
  partial1.familyName = 'Theridiidae';
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);
  counter.updateForPathSpec(toPathSpec(partial2), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);

  partial2 = Object.assign({ genusName: 'Steatoda' }, partial1);
  partial1.genusName = 'Latrodectus';
  counter.updateForPathSpec(toPathSpec(partial1), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);
  counter.updateForPathSpec(toPathSpec(partial2), null, null);
  expect(counter.getSpeciesCount()).toEqual(8);

  partial2 = Object.assign({ speciesName: 'triangulosa' }, partial1);
  partial1.speciesName = 'mactans';
  counter.updateForPathSpec(toPathSpec(partial1), 'Latrodectus mactans', null);
  expect(counter.getSpeciesCount()).toEqual(8);
  counter.updateForPathSpec(toPathSpec(partial2), 'Steatoda triangulosa', null);
  expect(counter.getSpeciesCount()).toEqual(8);

  partial2 = Object.assign({ subspeciesName: 'madeup2' }, partial1);
  partial1.subspeciesName = 'madeup1';
  counter.updateForPathSpec(
    toPathSpec(partial1),
    'Latrodectus mactans',
    'Latrodectus mactans madeup1'
  );
  expect(counter.getSpeciesCount()).toEqual(8);
  counter.updateForPathSpec(
    toPathSpec(partial2),
    'Latrodectus mactans',
    'Latrodectus mactans madeup2'
  );
  expect(counter.getSpeciesCount()).toEqual(8);
});

test('adding distantly lower ranks, twice each', () => {
  const fieldDefs: {
    field: keyof TaxonPathSpec;
    value: string;
    sp: string | null;
    subsp: string | null;
  }[] = [
    { field: 'kingdomName', value: 'Animalia', sp: null, subsp: null },
    { field: 'phylumName', value: 'Arthropoda', sp: null, subsp: null },
    { field: 'className', value: 'Arachnida', sp: null, subsp: null },
    { field: 'orderName', value: 'Araneae', sp: null, subsp: null },
    { field: 'familyName', value: 'Theridiidae', sp: null, subsp: null },
    { field: 'genusName', value: 'Latrodectus', sp: null, subsp: null },
    { field: 'speciesName', value: 'mactans', sp: 'Latrodectus mactans', subsp: null },
    {
      field: 'subspeciesName',
      value: 'madeup',
      sp: 'Latrodectus mactans',
      subsp: 'Latrodectus mactans madeup'
    }
  ];

  const partial1: Partial<TaxonPathSpec> = {};
  for (let i = 0; i < fieldDefs.length - 1; ++i) {
    const fieldDef1 = fieldDefs[i];
    partial1[fieldDef1.field] = fieldDef1.value;

    const partial2 = Object.assign({}, partial1);
    for (let j = i + 1; j < fieldDefs.length; ++j) {
      const fieldDef2 = fieldDefs[j];
      partial2[fieldDef2.field] = fieldDef2.value;

      const counter = TaxonCounter.createFromPathSpec(
        toPathSpec(partial1),
        null,
        fieldDef1.sp,
        fieldDef1.subsp
      );
      expect(counter.getSpeciesCount()).toEqual(1);
      counter.updateForPathSpec(toPathSpec(partial2), fieldDef2.sp, fieldDef2.subsp);
      expect(counter.getSpeciesCount()).toEqual(1);
      counter.updateForPathSpec(toPathSpec(partial2), fieldDef2.sp, fieldDef2.subsp);
      expect(counter.getSpeciesCount()).toEqual(1);
      counter.updateForPathSpec(toPathSpec(partial1), fieldDef1.sp, fieldDef1.subsp);
      expect(counter.getSpeciesCount()).toEqual(1);
    }
  }
});

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
