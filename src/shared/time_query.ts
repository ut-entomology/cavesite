import {
  QueryColumnID,
  type QueryColumnSpec,
  type QueryLocationFilter,
  type QueryTaxonFilter,
  type GeneralQuery,
  type QueryRow
} from './general_query';

export const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

const ADULTS_REGEX = /(\d+) *(adult|male|female|worker|alate|queen)/gi;
const IMMATURES_REGEX = /(\d+) *(im\.|imm|juv|pupa|larva)/gi;

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
  // Must occur in this order
  Unspecified,
  Immature,
  Adult,
  All
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
    columnID: QueryColumnID.OccurrenceRemarks,
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
    for (let i = 0; i <= LifeStage.All; ++i) {
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
    // Treat absence of a specimen count or specimen count of 0 as a 1.
    let specimenCount = row.resultCount! * (row.specimenCount ? row.specimenCount : 1);

    // Count adults, immatures, and unspecifieds.

    const lifeStage = row.lifeStage?.toLowerCase();
    let adultCount = this._countLifeStage(ADULTS_REGEX, row.occurrenceRemarks!);
    let immatureCount = this._countLifeStage(IMMATURES_REGEX, row.occurrenceRemarks!);
    if (adultCount == 0 && lifeStage == 'adult') {
      adultCount = specimenCount - immatureCount;
    }
    if (immatureCount == 0 && lifeStage == 'immature') {
      immatureCount = specimenCount - adultCount;
    }
    if (adultCount == 0 && immatureCount == 0) {
      if (lifeStage == 'adult') {
        adultCount = specimenCount;
      } else if (lifeStage) {
        immatureCount = specimenCount;
      }
    }
    let unspecifiedCount = specimenCount - adultCount - immatureCount;
    if (unspecifiedCount < 0) {
      specimenCount = adultCount + immatureCount;
      unspecifiedCount = 0;
    }

    // If there's an end date, record the species on a random date of the range
    // of dates, and divide the specimen counts among all the dates in the range.

    if (row.collectionEndDate) {
      const endDate = new Date(row.collectionEndDate);
      const startDaysEpoch = _toDaysEpoch(startDate);
      const endDaysEpoch = _toDaysEpoch(endDate);
      if (endDaysEpoch != startDaysEpoch) {
        deltaDays = endDaysEpoch - startDaysEpoch;
        const daysInRange = deltaDays + 1;
        const speciesDeltaDays = Math.floor(daysInRange * Math.random());
        speciesDate = new Date(startDateMillies + speciesDeltaDays * MILLIS_PER_DAY);
        adultCount /= daysInRange;
        immatureCount /= daysInRange;
        unspecifiedCount /= daysInRange;
        specimenCount /= daysInRange;
      }
    }

    // Update the species counts on a single date.

    let dateInfo = _toDateInfo(speciesDate);
    this._updateSpeciesTallies(
      dateInfo,
      unspecifiedCount > 0 ? taxonUnique : null,
      LifeStage.Unspecified
    );
    this._updateSpeciesTallies(
      dateInfo,
      immatureCount > 0 ? taxonUnique : null,
      LifeStage.Immature
    );
    this._updateSpeciesTallies(
      dateInfo,
      adultCount > 0 ? taxonUnique : null,
      LifeStage.Adult
    );
    this._updateSpeciesTallies(
      dateInfo,
      specimenCount > 0 ? taxonUnique : null,
      LifeStage.All
    );

    // Update the specimen counts on all dates in the range.

    for (let nextDay = 0; nextDay <= deltaDays; ++nextDay) {
      if (deltaDays > 0) {
        // Only compute the date if we have to, as repeating this is expensive.
        const date = new Date(startDateMillies + nextDay * MILLIS_PER_DAY);
        dateInfo = _toDateInfo(date);
      }
      this._updateSpecimenTallies(dateInfo, unspecifiedCount, LifeStage.Unspecified);
      this._updateSpecimenTallies(dateInfo, immatureCount, LifeStage.Immature);
      this._updateSpecimenTallies(dateInfo, adultCount, LifeStage.Adult);
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

        monthlySpecimenTotals: _roundTotals(stageTallies.monthlySpecimenTotals),
        seasonalSpecimenTotals: _roundTotals(stageTallies.seasonalSpecimenTotals),
        yearlySpecimenTotals: _roundTotals(stageTallies.yearlySpecimenTotals)
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
        weeklySpecimenTotals: _roundTotals(stageTallies.weeklySpecimenTotals),
        biweeklySpecimenTotals: _roundTotals(stageTallies.biweeklySpecimenTotals),
        monthlySpecimenTotals: _roundTotals(stageTallies.monthlySpecimenTotals),
        seasonalSpecimenTotals: _roundTotals(stageTallies.seasonalSpecimenTotals)
      });
    }
    return finalStageTallies;
  }

  private _countLifeStage(regex: RegExp, remarks: string | null): number {
    if (remarks == null) return 0;
    const matches = remarks.matchAll(regex);
    let total = 0;
    for (const match of matches) {
      total += parseInt(match[1]);
    }
    return total;
  }

  private _updateSpeciesTallies(
    dateInfo: _DateInfo,
    taxonUnique: string | null,
    lifeStage: LifeStage
  ) {
    // Update the history tallies.

    const history = this._historyStageTallies[lifeStage];
    this._setTaxonTally(history.monthlySpeciesTallies, dateInfo.yearMonth, taxonUnique);
    this._setTaxonTally(
      history.seasonalSpeciesTallies,
      dateInfo.yearSeason,
      taxonUnique
    );
    this._setTaxonTally(history.yearlySpeciesTallies, dateInfo.year, taxonUnique);

    // Update the seasonality tallies.

    const seasonality = this._seasonalityStageTallies[lifeStage];
    this._setTaxonTally(seasonality.weeklySpeciesTallies, dateInfo.week, taxonUnique);
    this._setTaxonTally(
      seasonality.biweeklySpeciesTallies,
      dateInfo.fortnight,
      taxonUnique
    );
    this._setTaxonTally(seasonality.monthlySpeciesTallies, dateInfo.month, taxonUnique);
    this._setTaxonTally(
      seasonality.seasonalSpeciesTallies,
      dateInfo.season,
      taxonUnique
    );
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

  private _setTaxonTally(
    tallies: _SpeciesTallies[],
    timeCode: number,
    taxonUnique: string | null
  ): void {
    let tally = tallies[timeCode];
    if (tally === undefined) {
      tally = {};
      tallies[timeCode] = tally;
    }
    if (taxonUnique) {
      tally[taxonUnique] = true;
    }
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
  let seasonYear = year;
  const month = date.getMonth() + 1; // 1-based
  const daysEpoch = _toDaysEpoch(date);

  // Cache days epoch of the start of each year and the start of each season,
  // in order to hasten computation.
  let yearStartDaysEpoch = _daysEpochByYear[year];
  if (yearStartDaysEpoch === undefined) {
    yearStartDaysEpoch = _toDaysEpoch(new Date(year, 0 /*Jan*/, 1));
    _daysEpochByYear[year] = yearStartDaysEpoch;

    const daysEpochBySeason: number[] = [];
    const leap = year % 4 == 0 && (year % 400 == 0 || year % 100 != 0) ? 1 : 0;
    daysEpochBySeason[0] = _toDaysEpoch(new Date(year, 2, 20 + leap));
    daysEpochBySeason[1] = _toDaysEpoch(new Date(year, 5, 21 + leap));
    daysEpochBySeason[2] = _toDaysEpoch(new Date(year, 8, 22 + leap));
    daysEpochBySeason[3] = _toDaysEpoch(new Date(year, 11, 21 + leap));
    _daysEpochByYearAndSeason[year] = daysEpochBySeason;
  }

  const dayOfYear = daysEpoch - yearStartDaysEpoch + 1; // 1-based
  let week = Math.ceil(dayOfYear / 7); // 1-based
  if (week == 53) week = 52; // 1 extra day most years; 2 extra days leap years
  // 0 = spring; 1 = summer; 2 = fall; 3 = winter
  const fortnight = Math.ceil(week / 2); // 1-based
  const daysEpochBySeason = _daysEpochByYearAndSeason[year];
  let season = 4;
  while (--season >= 0) {
    if (daysEpoch >= daysEpochBySeason[season]) break;
  }
  if (season < 0) {
    seasonYear -= 1;
    season = 3;
  }

  return {
    year,
    season,
    month,
    fortnight,
    week,
    yearSeason: seasonYear * 10 + season,
    yearMonth: year * 100 + month
  };
}

// TODO: use this globally
function _toDaysEpoch(date: Date): number {
  return Math.floor(date.getTime() / MILLIS_PER_DAY);
}

function _roundTotals(totals: number[]): number[] {
  return totals.map((total) => Math.round(total * 10) / 10);
}
