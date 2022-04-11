import {
  parseLatitude,
  parseLongitude,
  parseUncertaintyMeters,
  ValidationError
} from '../shared/validation';

const syntaxErrors = [
  '25 5',
  '25@5',
  'foo',
  '+25',
  '1..5',
  '20X',
  '20 q',
  '-23N',
  '-23S'
];

test('parsing valid latitudes', () => {
  const pairs: [string, number][] = [
    ['25', 25],
    ['25.45', 25.45],
    ['0.12', 0.12],
    ['-25.2', -25.2],
    ['25N', 25],
    ['25S', -25],
    ['25.5N', 25.5],
    ['25.5 s', -25.5]
  ];
  for (const pair of pairs) {
    expect(parseLatitude(pair[0])).toEqual(pair[1]);
  }
});

test('parsing valid longitudes', () => {
  const pairs: [string, number][] = [
    ['25', 25],
    ['25.45', 25.45],
    ['0.12', 0.12],
    ['-25.2', -25.2],
    ['25E', 25],
    ['25W', -25],
    ['25.5E', 25.5],
    ['25.5 w', -25.5]
  ];
  for (const pair of pairs) {
    expect(parseLongitude(pair[0])).toEqual(pair[1]);
  }
});

test('parse invalid latitudes', () => {
  for (const syntaxError of syntaxErrors) {
    expect(() => parseLatitude(syntaxError)).toThrow(
      new ValidationError('Invalid latitude')
    );
  }
  expect(() => parseLatitude('90.1')).toThrow(
    new ValidationError('Latitude out of range')
  );
  expect(() => parseLatitude('-90.1')).toThrow(
    new ValidationError('Latitude out of range')
  );
});

test('parse invalid longitudes', () => {
  for (const syntaxError of syntaxErrors) {
    expect(() => parseLongitude(syntaxError)).toThrow(
      new ValidationError('Invalid longitude')
    );
  }
  expect(() => parseLongitude('180.1')).toThrow(
    new ValidationError('Longitude out of range')
  );
  expect(() => parseLongitude('-180.1')).toThrow(
    new ValidationError('Longitude out of range')
  );
});

test('parse valid uncertainty meters', () => {
  const pairs: [string, number][] = [
    ['10', 10],
    ['10.1', 10.1],
    ['.2', 0.2],
    ['0.2', 0.2],
    ['1m', 1],
    ['1 m', 1],
    ['2 meter', 2],
    ['2 meters', 2]
  ];
  for (const pair of pairs) {
    expect(parseUncertaintyMeters(pair[0])).toEqual(pair[1]);
  }
});

test('parse invalid uncertainty meters', () => {
  const errors = ['foo', '1 1', '-1', '-1m', '10mm'];
  for (const error of errors) {
    expect(() => parseUncertaintyMeters(error)).toThrow(
      new ValidationError('Invalid uncertainty')
    );
  }
});
