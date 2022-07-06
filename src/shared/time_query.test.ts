import {
  LifeStage,
  HistoryStageTallies,
  //SeasonalityStageTallies,
  TimeChartTallier,
  SeasonalityStageTallies
} from './time_query';

test('date computation', () => {
  const tallier = new TimeChartTallier();

  tallier.addTimeQueryRow({
    resultCount: 1,
    collectionStartDate: new Date(2021, 11, 31),
    taxonUnique: 'Latrodectus',
    specimenCount: 1,
    lifeStage: 'adult'
  });
  tallier.addTimeQueryRow({
    resultCount: 1,
    collectionStartDate: new Date(2022, 0, 1),
    taxonUnique: 'Cicurina',
    specimenCount: 1,
    lifeStage: 'adult'
  });

  const history = tallier.getHistoryStageTallies();
  const seasonality = tallier.getSeasonalityStageTallies();
  // prettier-ignore
  checkHistorySpecies(history, LifeStage.Adult, [
    [[202112, 1], [202201, 1]],
    [[20213, 2]],
    [[2021, 1], [2022, 1]]
  ]);
  // prettier-ignore
  checkHistorySpecimens(history, LifeStage.Adult, [
    [[202112, 1], [202201, 1]],
    [[20213, 2]],
    [[2021, 1], [2022, 1]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecies(seasonality, LifeStage.Adult, [
    [[1, 1], [52, 1]],
    [[1, 1], [26, 1]],
    [[1, 1], [12, 1]],
    [[3, 2]]
  ]);
  // prettier-ignore
  checkSeasonalitySpecimens(seasonality, LifeStage.Adult, [
    [[1, 1], [52, 1]],
    [[1, 1], [26, 1]],
    [[1, 1], [12, 1]],
    [[3, 2]]
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
    //console.log(`checking history ${propertyName} ${pair}`);
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
    //console.log(`checking seasonality ${propertyName} ${pair}`);
    expect(timeUnitTotals[pair[0]]).toEqual(pair[1]);
  }
  expect(Object.keys(timeUnitTotals).length).toEqual(pairs.length);
}
