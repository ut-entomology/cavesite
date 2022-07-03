import {
  QueryColumnID,
  type QueryColumnSpec,
  type QueryLocationFilter,
  type QueryTaxonFilter,
  type GeneralQuery,
  type QueryRow
} from './general_query';

export const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const _daysEpochByYear: Record<number, number> = [];
const _daysEpochByYearAndSeason: Record<number, number[]> = [];

//// PUBLIC //////////////////////////////////////////////////////////////////

export interface TimeGraphQuery {
  fromDateMillis: number;
  throughDateMillis: number;
  locationFilter: QueryLocationFilter | null;
  taxonFilter: QueryTaxonFilter | null;
}

export enum LifeStage {
  Adult,
  Immature,
  Unspecified,
  All,
  _LENGTH
}

export function convertTimeQuery(timeGraphQuery: TimeGraphQuery): GeneralQuery {
  const columnSpecs: QueryColumnSpec[] = [];
  columnSpecs.push({
    columnID: QueryColumnID.ResultCount,
    ascending: null,
    optionText: null
  });
  columnSpecs.push({
    columnID: QueryColumnID.CollectionStartDate,
    ascending: true,
    optionText: null
  });
  columnSpecs.push({
    columnID: QueryColumnID.CollectionEndDate,
    ascending: true,
    optionText: null
  });
  columnSpecs.push({
    columnID: QueryColumnID.TaxonUnique,
    ascending: null,
    optionText: null
  });
  columnSpecs.push({
    columnID: QueryColumnID.Obligate,
    ascending: null,
    optionText: timeGraphQuery.taxonFilter == null ? 'Yes' : null
  });
  columnSpecs.push({
    columnID: QueryColumnID.LifeStage,
    ascending: null,
    optionText: null
  });
  columnSpecs.push({
    columnID: QueryColumnID.SpecimenCount,
    ascending: null,
    optionText: null
  });

  return {
    columnSpecs,
    dateFilter: {
      fromDateMillis: timeGraphQuery.fromDateMillis,
      throughDateMillis: timeGraphQuery.throughDateMillis
    },
    locationFilter: timeGraphQuery.locationFilter,
    taxonFilter: timeGraphQuery.taxonFilter
  };
}

export interface HistoryStageTallies {
  monthlySpeciesTotals: number[];
  seasonalSpeciesTotals: number[];
  yearlySpeciesTotals: number[];

  monthlySpecimenTotals: number[];
  seasonalSpecimenTotals: number[];
  yearlySpecimenTotals: number[];
}

export interface SeasonalityStageTallies {
  weeklySpeciesTotals: number[];
  biweeklySpeciesTotals: number[];
  monthlySpeciesTotals: number[];
  seasonalSpeciesTotals: number[];

  weeklySpecimenTotals: number[];
  biweeklySpecimenTotals: number[];
  monthlySpecimenTotals: number[];
  seasonalSpecimenTotals: number[];
}

type _SpeciesTallies = Record<string, boolean>;

interface _HistoryStageTallies {
  // indexed first by unit time, then by species ID
  monthlySpeciesTallies: _SpeciesTallies[];
  seasonalSpeciesTallies: _SpeciesTallies[];
  yearlySpeciesTallies: _SpeciesTallies[];

  monthlySpecimenTotals: number[];
  seasonalSpecimenTotals: number[];
  yearlySpecimenTotals: number[];
}

interface _SeasonalityStageTallies {
  // indexed first by unit time, then by species ID
  weeklySpeciesTallies: _SpeciesTallies[];
  biweeklySpeciesTallies: _SpeciesTallies[];
  monthlySpeciesTallies: _SpeciesTallies[];
  seasonalSpeciesTallies: _SpeciesTallies[];

  weeklySpecimenTotals: number[];
  biweeklySpecimenTotals: number[];
  monthlySpecimenTotals: number[];
  seasonalSpecimenTotals: number[];
}

export class TimeChartTallier {
  private _historyStageTallies: _HistoryStageTallies[] = [];
  private _seasonalityStageTallies: _SeasonalityStageTallies[] = [];

  constructor() {
    for (let i = 0; i < LifeStage._LENGTH; ++i) {
      this._historyStageTallies.push({
        monthlySpeciesTallies: [],
        seasonalSpeciesTallies: [],
        yearlySpeciesTallies: [],
        monthlySpecimenTotals: [],
        seasonalSpecimenTotals: [],
        yearlySpecimenTotals: []
      });
      this._seasonalityStageTallies.push({
        weeklySpeciesTallies: [],
        biweeklySpeciesTallies: [],
        monthlySpeciesTallies: [],
        seasonalSpeciesTallies: [],
        weeklySpecimenTotals: [],
        biweeklySpecimenTotals: [],
        monthlySpecimenTotals: [],
        seasonalSpecimenTotals: []
      });
    }
  }

  addTimeQueryRow(row: QueryRow): void {
    const startDate = new Date(row.collectionStartDate!);
    const startDateMillies = startDate.getTime();
    let speciesDate = startDate;
    let deltaDays = 0; // no. days from start to end (0 => start == end)
    const taxonUnique = row.taxonUnique!;
    let specimenCount = row.resultCount! * row.specimenCount!;

    // If there's an end date, record the species on a random date of the range
    // of dates, and divide the specimen count up among all the dates in the range.

    if (row.collectionEndDate) {
      const endDate = new Date(row.collectionEndDate);
      const startDaysEpoch = _toDaysEpoch(startDate);
      const endDaysEpoch = _toDaysEpoch(endDate);
      if (endDaysEpoch != startDaysEpoch) {
        deltaDays = endDaysEpoch - startDaysEpoch;
        const speciesDeltaDays = Math.floor((deltaDays + 1) * Math.random());
        speciesDate = new Date(startDateMillies + speciesDeltaDays * MILLIS_PER_DAY);
        specimenCount = specimenCount / (deltaDays + 1);
      }
    }

    // Update the species count on a single date.

    let dateInfo = _toDateInfo(speciesDate);
    this._updateSpeciesTallies(dateInfo, taxonUnique, LifeStage.All);
    if (row.lifeStage?.toLowerCase() == 'adult') {
      this._updateSpeciesTallies(dateInfo, taxonUnique, LifeStage.Adult);
    } else if (row.lifeStage) {
      this._updateSpeciesTallies(dateInfo, taxonUnique, LifeStage.Immature);
    } else {
      this._updateSpeciesTallies(dateInfo, taxonUnique, LifeStage.Unspecified);
    }

    // Update the specimen count on all dates in the range.

    for (let nextDay = 0; nextDay <= deltaDays; ++nextDay) {
      if (deltaDays > 0) {
        // Only compute the date if we have to, as repeating this is expensive.
        const date = new Date(startDateMillies + nextDay * MILLIS_PER_DAY);
        dateInfo = _toDateInfo(date);
      }
      this._updateSpecimenTallies(dateInfo, specimenCount, LifeStage.All);
      if (row.lifeStage?.toLowerCase() == 'adult') {
        this._updateSpecimenTallies(dateInfo, specimenCount, LifeStage.Adult);
      } else if (row.lifeStage) {
        this._updateSpecimenTallies(dateInfo, specimenCount, LifeStage.Immature);
      } else {
        this._updateSpecimenTallies(dateInfo, specimenCount, LifeStage.Unspecified);
      }
    }
  }

  getHistoryStageTallies(): HistoryStageTallies[] {
    const finalStageTallies: HistoryStageTallies[] = [];
    for (const stageTallies of this._historyStageTallies) {
      finalStageTallies.push({
        monthlySpeciesTotals: stageTallies.monthlySpeciesTallies.map(
          (tallies) => Object.keys(tallies).length
        ),
        seasonalSpeciesTotals: stageTallies.seasonalSpeciesTallies.map(
          (tallies) => Object.keys(tallies).length
        ),
        yearlySpeciesTotals: stageTallies.yearlySpeciesTallies.map(
          (tallies) => Object.keys(tallies).length
        ),

        monthlySpecimenTotals: stageTallies.monthlySpecimenTotals,
        seasonalSpecimenTotals: stageTallies.seasonalSpecimenTotals,
        yearlySpecimenTotals: stageTallies.yearlySpecimenTotals
      });
    }
    return finalStageTallies;
  }

  getSeasonalityStageTallies(): SeasonalityStageTallies[] {
    const finalStageTallies: SeasonalityStageTallies[] = [];
    for (const stageTallies of this._seasonalityStageTallies) {
      finalStageTallies.push({
        weeklySpeciesTotals: stageTallies.weeklySpeciesTallies.map(
          (tallies) => Object.keys(tallies).length
        ),
        biweeklySpeciesTotals: stageTallies.biweeklySpeciesTallies.map(
          (tallies) => Object.keys(tallies).length
        ),
        monthlySpeciesTotals: stageTallies.monthlySpeciesTallies.map(
          (tallies) => Object.keys(tallies).length
        ),
        seasonalSpeciesTotals: stageTallies.seasonalSpeciesTallies.map(
          (tallies) => Object.keys(tallies).length
        ),
        weeklySpecimenTotals: stageTallies.weeklySpecimenTotals,
        biweeklySpecimenTotals: stageTallies.biweeklySpecimenTotals,
        monthlySpecimenTotals: stageTallies.monthlySpecimenTotals,
        seasonalSpecimenTotals: stageTallies.seasonalSpecimenTotals
      });
    }
    return finalStageTallies;
  }

  private _updateSpeciesTallies(
    dateInfo: _DateInfo,
    taxonUnique: string,
    lifeStage: LifeStage
  ) {
    // Update the history tallies.

    const history = this._historyStageTallies[lifeStage];
    history.monthlySpeciesTallies[dateInfo.yearMonth][taxonUnique] = true;
    history.seasonalSpeciesTallies[dateInfo.yearSeason][taxonUnique] = true;
    history.yearlySpeciesTallies[dateInfo.year][taxonUnique] = true;

    // Update the seasonality tallies.

    const seasonality = this._seasonalityStageTallies[lifeStage];
    seasonality.weeklySpeciesTallies[dateInfo.week][taxonUnique] = true;
    seasonality.biweeklySpeciesTallies[dateInfo.fortnight][taxonUnique] = true;
    seasonality.monthlySpeciesTallies[dateInfo.month][taxonUnique] = true;
    seasonality.seasonalSpeciesTallies[dateInfo.season][taxonUnique] = true;
  }

  private _updateSpecimenTallies(
    dateInfo: _DateInfo,
    specimenCount: number,
    lifeStage: LifeStage
  ) {
    // Update the history tallies.

    const history = this._historyStageTallies[lifeStage];
    history.monthlySpecimenTotals[dateInfo.yearMonth] =
      (history.monthlySpecimenTotals[dateInfo.yearMonth] || 0) + specimenCount;
    history.seasonalSpecimenTotals[dateInfo.yearSeason] =
      (history.seasonalSpecimenTotals[dateInfo.yearSeason] || 0) + specimenCount;
    history.yearlySpecimenTotals[dateInfo.year] =
      (history.yearlySpecimenTotals[dateInfo.year] || 0) + specimenCount;

    // Update the seasonality tallies.

    const seasonality = this._seasonalityStageTallies[lifeStage];
    seasonality.weeklySpecimenTotals[dateInfo.week] =
      (seasonality.weeklySpecimenTotals[dateInfo.week] || 0) + specimenCount;
    seasonality.biweeklySpecimenTotals[dateInfo.fortnight] =
      (seasonality.biweeklySpecimenTotals[dateInfo.fortnight] || 0) + specimenCount;
    seasonality.monthlySpecimenTotals[dateInfo.month] =
      (seasonality.monthlySpecimenTotals[dateInfo.month] || 0) + specimenCount;
    seasonality.seasonalSpecimenTotals[dateInfo.season] =
      (seasonality.seasonalSpecimenTotals[dateInfo.season] || 0) + specimenCount;
  }
}

//// PRIVATE /////////////////////////////////////////////////////////////////

interface _DateInfo {
  year: number;
  season: number; // season of year, spring first, starting at 0
  month: number; // month of year, starting at 1
  fortnight: number; // fortnight of year, starting at 1
  week: number; // weak of year, starting at 1
  yearSeason: number; // year * 10 + season;
  yearMonth: number; // year * 100 + month;
}

// returns weeks since epoch (millis = 0), resetting each week at start of year
function _toDateInfo(date: Date): _DateInfo {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-based
  const daysEpoch = _toDaysEpoch(date);

  // Cache days epoch of the start of each year and the start of each season,
  // in order to hasten computation.
  let yearStartDaysEpoch = _daysEpochByYear[year];
  if (yearStartDaysEpoch === undefined) {
    yearStartDaysEpoch = _toDaysEpoch(new Date(year, 1, 1));
    _daysEpochByYear[year] = yearStartDaysEpoch;

    const daysEpochBySeason: number[] = [];
    const leap = year % 4 == 0 && (year % 400 == 0 || year % 100 != 0) ? 1 : 0;
    daysEpochBySeason[0] = _toDaysEpoch(new Date(year, 3, 20 + leap));
    daysEpochBySeason[1] = _toDaysEpoch(new Date(year, 6, 21 + leap));
    daysEpochBySeason[2] = _toDaysEpoch(new Date(year, 9, 22 + leap));
    daysEpochBySeason[3] = _toDaysEpoch(new Date(year, 12, 21 + leap));
    _daysEpochByYearAndSeason[year] = daysEpochBySeason;
  }

  const dayOfYear = daysEpoch - yearStartDaysEpoch + 1; // 1-based
  const week = Math.ceil(dayOfYear / 7); // 1-based
  const season =
    _daysEpochByYearAndSeason[year].findIndex(
      (seasonStartDaysEpoch) => daysEpoch >= seasonStartDaysEpoch
    ) || 0;

  return {
    year,
    season,
    month,
    fortnight: Math.ceil(week / 2),
    week,
    yearSeason: year * 10 + season,
    yearMonth: year * 100 + month
  };
}

// TODO: use this globally
function _toDaysEpoch(date: Date): number {
  return Math.floor(date.getTime() / MILLIS_PER_DAY);
}
