import {
  LifeStage,
  HistoryStageTallies,
  SeasonalityStageTallies,
  TimeChartTallier
} from './time_query';

// TODO: Update tests to include path spec in query rows, as time queries
// now request that this information be returned.

test('date season date ranges', () => {
  const tallier = new TimeChartTallier();

  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2021, 2, 24),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Theridiidae',
    genusName: 'Steatoda',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Steatoda',
    specimenCount: 1,
    lifeStage: 'adult'
  });
  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2021, 11, 31),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Theridiidae',
    genusName: 'Latrodectus',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Latrodectus',
    specimenCount: 1,
    lifeStage: 'adult'
  });
  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 1,
    lifeStage: 'adult'
  });
  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2023, 6, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Pholcidae',
    genusName: 'Pholcus',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Pholcus',
    specimenCount: 1,
    lifeStage: 'adult'
  });
  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2023, 9, 1),
    taxonUnique: 'Xysticus',
    specimenCount: 1,
    lifeStage: 'adult'
  });

  const history = tallier.getHistoryStageTallies();
  const seasonality = tallier.getSeasonalityStageTallies();
  // prettier-ignore
  checkHistorySpecies(history, LifeStage.Adult, [
    [[202103, 1], [202112, 1], [202201, 1], [202307, 1], [202310, 1]],
    [[20210, 1], [20213, 2], [20231, 1], [20232, 1]],
    [[2021, 2], [2022, 1], [2023, 2]]
  ]);
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Adult, [
    [[202103, 1], [202112, 1], [202201, 1], [202307, 1], [202310, 1]],
    [[20210, 1], [20213, 2], [20231, 1], [20232, 1]],
    [[2021, 2], [2022, 1], [2023, 2]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecies(seasonality, LifeStage.Adult, [
    [[1, 1], [12, 1], [26, 1], [40, 1], [52, 1]],
    [[1, 1], [6, 1], [13, 1], [20, 1], [26, 1]],
    [[1, 1], [3, 1], [7, 1], [10, 1], [12, 1]],
    [[0, 1], [1, 1], [2, 1], [3, 2]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecimens(seasonality, LifeStage.Adult, [
    [[1, 1], [12, 1], [26, 1], [40, 1], [52, 1]],
    [[1, 1], [6, 1], [13, 1], [20, 1], [26, 1]],
    [[1, 1], [3, 1], [7, 1], [10, 1], [12, 1]],
    [[0, 1], [1, 1], [2, 1], [3, 2]]
  ]);
});

test('distribution of specimens between start and end dates', () => {
  const tallier = new TimeChartTallier();

  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 30), // 2 days in 1st month
    collectionEndDate: new Date(2022, 1, 2), // 2 days in 2nd month
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 4
  });

  const history = tallier.getHistoryStageTallies();
  const seasonality = tallier.getSeasonalityStageTallies();
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Unspecified, [
    [[202201, 2], [202202, 2]],
    [[20213, 4]],
    [[2022, 4]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecimens(seasonality, LifeStage.Unspecified, [
    [[5, 4]],
    [[3, 4]],
    [[1, 2], [2, 2]],
    [[3, 4]]
  ]);
});

test('overlapping dates for different taxa and specimen and record counts', () => {
  const tallier = new TimeChartTallier();

  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 1,
    lifeStage: 'adult'
  });
  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Theridiidae',
    genusName: 'Steatoda',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Steatoda',
    specimenCount: 2,
    lifeStage: 'adult'
  });
  tallier.addTimeQueryRow({
    recordCount: 5,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Theridiidae',
    genusName: 'Latrodectus',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Latrodectus',
    specimenCount: 3,
    lifeStage: 'adult'
  });

  const history = tallier.getHistoryStageTallies();
  const seasonality = tallier.getSeasonalityStageTallies();
  // prettier-ignore
  checkHistorySpecies(history, LifeStage.Adult, [
    [[202201, 3]],
    [[20213, 3]],
    [[2022, 3]]
  ]);
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Adult, [
    [[202201, 18]],
    [[20213, 18]],
    [[2022, 18]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecies(seasonality, LifeStage.Adult, [
    [[1, 3]],
    [[1, 3]],
    [[1, 3]],
    [[3, 3]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecimens(seasonality, LifeStage.Adult, [
    [[1, 18]],
    [[1, 18]],
    [[1, 18]],
    [[3, 18]]
  ]);
});

test('overlapping dates and taxa for different specimen counts', () => {
  const tallier = new TimeChartTallier();

  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Theridiidae',
    genusName: 'Steatoda',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Steatoda',
    specimenCount: 1,
    lifeStage: 'adult'
  });
  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 1,
    lifeStage: 'adult'
  });
  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 3,
    lifeStage: 'adult'
  });

  const history = tallier.getHistoryStageTallies();
  const seasonality = tallier.getSeasonalityStageTallies();
  // prettier-ignore
  checkHistorySpecies(history, LifeStage.Adult, [
    [[202201, 2]],
    [[20213, 2]],
    [[2022, 2]]
  ]);
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Adult, [
    [[202201, 5]],
    [[20213, 5]],
    [[2022, 5]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecies(seasonality, LifeStage.Adult, [
    [[1, 2]],
    [[1, 2]],
    [[1, 2]],
    [[3, 2]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecimens(seasonality, LifeStage.Adult, [
    [[1, 5]],
    [[1, 5]],
    [[1, 5]],
    [[3, 5]]
  ]);
});

test('separation of different life stages', () => {
  const tallier = new TimeChartTallier();

  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 1,
    lifeStage: 'adult'
  });
  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 2,
    lifeStage: 'immature'
  });
  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 3,
    lifeStage: 'juvie'
  });
  tallier.addTimeQueryRow({
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 10
    // lifeStage unspecified
  });

  const history = tallier.getHistoryStageTallies();
  const seasonality = tallier.getSeasonalityStageTallies();

  // prettier-ignore
  checkHistorySpecies(history, LifeStage.Unspecified, [
    [[202201, 1]], [[20213, 1]], [[2022, 1]]
  ]);
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Unspecified, [
    [[202201, 10]], [[20213, 10]], [[2022, 10]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecies(seasonality, LifeStage.Unspecified, [
    [[1, 1]], [[1, 1]], [[1, 1]], [[3, 1]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecimens(seasonality, LifeStage.Unspecified, [
    [[1, 10]], [[1, 10]], [[1, 10]], [[3, 10]]
  ]);

  // prettier-ignore
  checkHistorySpecies(history, LifeStage.Immature, [
    [[202201, 1]], [[20213, 1]], [[2022, 1]]
  ]);
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Immature, [
    [[202201, 5]], [[20213, 5]], [[2022, 5]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecies(seasonality, LifeStage.Immature, [
    [[1, 1]], [[1, 1]], [[1, 1]], [[3, 1]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecimens(seasonality, LifeStage.Immature, [
    [[1, 5]], [[1, 5]], [[1, 5]], [[3, 5]]
  ]);

  // prettier-ignore
  checkHistorySpecies(history, LifeStage.Adult, [
    [[202201, 1]], [[20213, 1]], [[2022, 1]]
  ]);
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Adult, [
    [[202201, 1]], [[20213, 1]], [[2022, 1]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecies(seasonality, LifeStage.Adult, [
    [[1, 1]], [[1, 1]], [[1, 1]], [[3, 1]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecimens(seasonality, LifeStage.Adult, [
    [[1, 1]], [[1, 1]], [[1, 1]], [[3, 1]]
  ]);
});

test('life stage indications in remarks', () => {
  const tallier = new TimeChartTallier();

  tallier.addTimeQueryRow({
    // 1 adult, 2 immature
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 3,
    lifeStage: 'adult',
    specimenNotes: '2 immatures'
  });
  tallier.addTimeQueryRow({
    // 1 adult, 6 immature
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 7,
    lifeStage: 'immature',
    specimenNotes: '1 adult'
  });
  tallier.addTimeQueryRow({
    // 3 adults, 2 unspecified
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 5,
    specimenNotes: '3 adults'
  });
  tallier.addTimeQueryRow({
    // 2 adults, 1 immature, 7 unspecified
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 10,
    specimenNotes: '2 adults, 1 im.'
  });
  tallier.addTimeQueryRow({
    // 5 immatures
    recordCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    phylumName: 'Arthropoda',
    className: 'Arachnida',
    orderName: 'Araneae',
    familyName: 'Hahniidae',
    genusName: 'Cicurina',
    speciesName: null,
    subspeciesName: null,
    taxonUnique: 'Cicurina',
    specimenCount: 5,
    lifeStage: 'immature',
    specimenNotes: '5 immatures'
  });

  const history = tallier.getHistoryStageTallies();

  // prettier-ignore
  checkHistorySpecies(history, LifeStage.Unspecified, [
    [[202201, 1]], [[20213, 1]], [[2022, 1]]
  ]);
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Unspecified, [
    [[202201, 9]], [[20213, 9]], [[2022, 9]]
  ]);

  // prettier-ignore
  checkHistorySpecies(history, LifeStage.Immature, [
    [[202201, 1]], [[20213, 1]], [[2022, 1]]
  ]);
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Immature, [
    [[202201, 14]], [[20213, 14]], [[2022, 14]]
  ]);

  // prettier-ignore
  checkHistorySpecies(history, LifeStage.Adult, [
    [[202201, 1]], [[20213, 1]], [[2022, 1]]
  ]);
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Adult, [
    [[202201, 7]], [[20213, 7]], [[2022, 7]]
  ]);
});

function checkHistorySpecies(
  talliesByStage: HistoryStageTallies[],
  lifeStage: LifeStage,
  pairsByTimeUnit: number[][][]
): void {
  const stageTallies = talliesByStage[lifeStage];
  checkHistoryTimeUnit(stageTallies, 'monthlySpeciesTotals', pairsByTimeUnit[0]);
  checkHistoryTimeUnit(stageTallies, 'seasonalSpeciesTotals', pairsByTimeUnit[1]);
  checkHistoryTimeUnit(stageTallies, 'yearlySpeciesTotals', pairsByTimeUnit[2]);
}

function checkHistorySpecimens(
  talliesByStage: HistoryStageTallies[],
  lifeStage: LifeStage,
  pairsByTimeUnit: number[][][]
): void {
  const stageTallies = talliesByStage[lifeStage];
  checkHistoryTimeUnit(stageTallies, 'monthlySpecimenTotals', pairsByTimeUnit[0]);
  checkHistoryTimeUnit(stageTallies, 'seasonalSpecimenTotals', pairsByTimeUnit[1]);
  checkHistoryTimeUnit(stageTallies, 'yearlySpecimenTotals', pairsByTimeUnit[2]);
}

function checkSeasonalitySpecies(
  talliesByStage: SeasonalityStageTallies[],
  lifeStage: LifeStage,
  pairsByTimeUnit: number[][][]
): void {
  const stageTallies = talliesByStage[lifeStage];
  checkSeasonalityTimeUnit(stageTallies, 'weeklySpeciesTotals', pairsByTimeUnit[0]);
  checkSeasonalityTimeUnit(stageTallies, 'biweeklySpeciesTotals', pairsByTimeUnit[1]);
  checkSeasonalityTimeUnit(stageTallies, 'monthlySpeciesTotals', pairsByTimeUnit[2]);
  checkSeasonalityTimeUnit(stageTallies, 'seasonalSpeciesTotals', pairsByTimeUnit[3]);
}

function checkSeasonalitySpecimens(
  talliesByStage: SeasonalityStageTallies[],
  lifeStage: LifeStage,
  pairsByTimeUnit: number[][][]
): void {
  const stageTallies = talliesByStage[lifeStage];
  checkSeasonalityTimeUnit(stageTallies, 'weeklySpecimenTotals', pairsByTimeUnit[0]);
  checkSeasonalityTimeUnit(stageTallies, 'biweeklySpecimenTotals', pairsByTimeUnit[1]);
  checkSeasonalityTimeUnit(stageTallies, 'monthlySpecimenTotals', pairsByTimeUnit[2]);
  checkSeasonalityTimeUnit(stageTallies, 'seasonalSpecimenTotals', pairsByTimeUnit[3]);
}

function checkHistoryTimeUnit(
  tallies: HistoryStageTallies,
  propertyName: keyof HistoryStageTallies,
  pairs: number[][]
): void {
  const timeUnitTotals = tallies[propertyName];
  for (const pair of pairs) {
    // console.log(`checking history ${propertyName} ${pair}`);
    expect(timeUnitTotals[pair[0]]).toEqual(pair[1]);
  }
  expect(Object.keys(timeUnitTotals).length).toEqual(pairs.length);
}

function checkSeasonalityTimeUnit(
  tallies: SeasonalityStageTallies,
  propertyName: keyof SeasonalityStageTallies,
  pairs: number[][]
): void {
  const timeUnitTotals = tallies[propertyName];
  for (const pair of pairs) {
    // console.log(`checking seasonality ${propertyName} ${pair}`);
    expect(timeUnitTotals[pair[0]]).toEqual(pair[1]);
  }
  expect(Object.keys(timeUnitTotals).length).toEqual(pairs.length);
}
