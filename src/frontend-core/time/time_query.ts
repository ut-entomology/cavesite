/**
 * Library for generating data for the time charts.
 */

import {
  ROOT_TAXON_UNIQUE,
  type TaxonPathSpec,
  toSpeciesAndSubspecies
} from '../../shared/model';
import {
  MILLIS_PER_DAY,
  partialDateHasMonth,
  toDaysEpoch,
  toZonelessMonthAndYear
} from '../../shared/date_tools';
import {
  QueryColumnID,
  type QueryColumnSpec,
  type QueryLocationFilter,
  type QueryTaxonFilter,
  type GeneralQuery,
  type QueryRow
} from '../../shared/general_query';
import { toDateFromNumbers } from '../../shared/date_tools';
import { TaxonCounter } from '../../shared/taxon_counter';

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
  onlyFederallyListed: boolean;
  onlySGCN: boolean;
}

export enum LifeStage {
  // Must occur in this order
  Unspecified,
  Immature,
  Adult,
  All
}

export function convertTimeQuery(
  timeGraphQuery: TimeGraphQuery,
  queryAllTaxa: boolean,
  countBlankDates: boolean
): GeneralQuery {
  const columnSpecs: QueryColumnSpec[] = [];
  columnSpecs.push({
    columnID: QueryColumnID.RecordCount,
    ascending: null,
    optionText: null
  });
  if (countBlankDates) {
    columnSpecs.push({
      columnID: QueryColumnID.CollectionStartDate,
      ascending: null,
      optionText: 'Blank'
    });
  } else {
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
      columnID: QueryColumnID.Phylum,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Class,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Order,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Family,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Genus,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Species,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.Subspecies,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.TaxonUnique,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.LifeStage,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.SpecimenNotes,
      ascending: null,
      optionText: null
    });
    columnSpecs.push({
      columnID: QueryColumnID.SpecimenCount,
      ascending: null,
      optionText: null
    });
    if (timeGraphQuery.taxonFilter === null && !queryAllTaxa) {
      columnSpecs.push({
        columnID: QueryColumnID.KarstObligate,
        ascending: null,
        optionText: 'Yes'
      });
    }
    if (timeGraphQuery.onlyFederallyListed) {
      columnSpecs.push({
        columnID: QueryColumnID.IsFederallyListed,
        ascending: null,
        optionText: 'Yes'
      });
    }
    if (timeGraphQuery.onlySGCN) {
      columnSpecs.push({
        columnID: QueryColumnID.TpwdStatus,
        ascending: null,
        optionText: 'SGCN'
      });
    }
  }

  return {
    columnSpecs,
    dateFilter: countBlankDates
      ? null
      : {
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
  biweeklySpeciesTotals: number[];
  monthlySpeciesTotals: number[];
  seasonalSpeciesTotals: number[];

  biweeklySpecimenTotals: number[];
  monthlySpecimenTotals: number[];
  seasonalSpecimenTotals: number[];
}

interface _HistoryStageTallies {
  // indexed first by unit time, then by species ID
  monthlySpeciesTallies: (TaxonCounter | null)[];
  seasonalSpeciesTallies: (TaxonCounter | null)[];
  yearlySpeciesTallies: (TaxonCounter | null)[];

  monthlySpecimenTotals: number[];
  seasonalSpecimenTotals: number[];
  yearlySpecimenTotals: number[];
}

interface _SeasonalityStageTallies {
  // indexed first by unit time, then by species ID
  biweeklySpeciesTallies: (TaxonCounter | null)[];
  monthlySpeciesTallies: (TaxonCounter | null)[];
  seasonalSpeciesTallies: (TaxonCounter | null)[];

  biweeklySpecimenTotals: number[];
  monthlySpecimenTotals: number[];
  seasonalSpecimenTotals: number[];
}

export class TimeChartTallier {
  missingMonthExclusions = 0;
  missingDayExclusions = 0;

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
        biweeklySpeciesTallies: [],
        monthlySpeciesTallies: [],
        seasonalSpeciesTallies: [],
        biweeklySpecimenTotals: [],
        monthlySpecimenTotals: [],
        seasonalSpecimenTotals: []
      });
    }
  }

  addTimeQueryRow(row: QueryRow): void {
    (row as any).kingdomName = ROOT_TAXON_UNIQUE;
    const pathSpec = row as TaxonPathSpec;
    const startDate = new Date(row.collectionStartDate!);
    const startDateMillies = startDate.getTime();
    let speciesDate = startDate;
    let deltaDays = 0; // no. days from start to end (0 => start == end)
    // Treat absence of a specimen count or specimen count of 0 as a 1.
    let specimenCount = row.recordCount! * (row.specimenCount ? row.specimenCount : 1);
    const [species, subspecies] = toSpeciesAndSubspecies(pathSpec, row.taxonUnique!);

    // Count adults, immatures, and unspecifieds.

    const lifeStage = row.lifeStage?.toLowerCase();
    let adultCount = this._countLifeStage(ADULTS_REGEX, row.specimenNotes!);
    let immatureCount = this._countLifeStage(IMMATURES_REGEX, row.specimenNotes!);
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

    if (row.partialStartDate) {
      if (partialDateHasMonth(row.partialStartDate)) {
        ++this.missingDayExclusions;
      } else {
        ++this.missingMonthExclusions;
      }
    } else if (row.collectionEndDate) {
      const endDate = new Date(row.collectionEndDate);
      const startDaysEpoch = toDaysEpoch(startDate);
      const endDaysEpoch = toDaysEpoch(endDate);
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

    let dateInfo = _toDateInfo(speciesDate, row.partialStartDate!);
    this._updateSpeciesTallies(
      dateInfo,
      unspecifiedCount > 0 ? pathSpec : null,
      species,
      subspecies,
      LifeStage.Unspecified
    );
    this._updateSpeciesTallies(
      dateInfo,
      immatureCount > 0 ? pathSpec : null,
      species,
      subspecies,
      LifeStage.Immature
    );
    this._updateSpeciesTallies(
      dateInfo,
      adultCount > 0 ? pathSpec : null,
      species,
      subspecies,
      LifeStage.Adult
    );
    this._updateSpeciesTallies(
      dateInfo,
      specimenCount > 0 ? pathSpec : null,
      species,
      subspecies,
      LifeStage.All
    );

    // Update the specimen counts on all dates in the range.

    for (let nextDay = 0; nextDay <= deltaDays; ++nextDay) {
      if (deltaDays > 0) {
        // Only compute the date if we have to, as repeating this is expensive.
        const date = new Date(startDateMillies + nextDay * MILLIS_PER_DAY);
        dateInfo = _toDateInfo(date, row.partialStartDate!);
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
        monthlySpeciesTotals: stageTallies.monthlySpeciesTallies.map((counter) =>
          _getSpeciesCount(counter)
        ),
        seasonalSpeciesTotals: stageTallies.seasonalSpeciesTallies.map((counter) =>
          _getSpeciesCount(counter)
        ),
        yearlySpeciesTotals: stageTallies.yearlySpeciesTallies.map((counter) =>
          _getSpeciesCount(counter)
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
        biweeklySpeciesTotals: stageTallies.biweeklySpeciesTallies.map((counter) =>
          _getSpeciesCount(counter)
        ),
        monthlySpeciesTotals: stageTallies.monthlySpeciesTallies.map((counter) =>
          _getSpeciesCount(counter)
        ),
        seasonalSpeciesTotals: stageTallies.seasonalSpeciesTallies.map((counter) =>
          _getSpeciesCount(counter)
        ),
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
    pathSpec: TaxonPathSpec | null,
    species: string | null,
    subspecies: string | null,
    lifeStage: LifeStage
  ) {
    // Update the history tallies.

    const history = this._historyStageTallies[lifeStage];
    this._addTaxonTally(
      history.monthlySpeciesTallies,
      dateInfo.yearMonth,
      pathSpec,
      species,
      subspecies
    );
    this._addTaxonTally(
      history.seasonalSpeciesTallies,
      dateInfo.yearSeason,
      pathSpec,
      species,
      subspecies
    );
    this._addTaxonTally(
      history.yearlySpeciesTallies,
      dateInfo.year,
      pathSpec,
      species,
      subspecies
    );

    // Update the seasonality tallies.

    const seasonality = this._seasonalityStageTallies[lifeStage];
    this._addTaxonTally(
      seasonality.biweeklySpeciesTallies,
      dateInfo.fortnight,
      pathSpec,
      species,
      subspecies
    );
    this._addTaxonTally(
      seasonality.monthlySpeciesTallies,
      dateInfo.month,
      pathSpec,
      species,
      subspecies
    );
    this._addTaxonTally(
      seasonality.seasonalSpeciesTallies,
      dateInfo.season,
      pathSpec,
      species,
      subspecies
    );
  }

  private _updateSpecimenTallies(
    dateInfo: _DateInfo,
    specimenCount: number,
    lifeStage: LifeStage
  ) {
    // Update the history tallies.

    const history = this._historyStageTallies[lifeStage];
    if (dateInfo.yearMonth !== null) {
      history.monthlySpecimenTotals[dateInfo.yearMonth] =
        (history.monthlySpecimenTotals[dateInfo.yearMonth] || 0) + specimenCount;
    }
    if (dateInfo.yearSeason !== null) {
      history.seasonalSpecimenTotals[dateInfo.yearSeason] =
        (history.seasonalSpecimenTotals[dateInfo.yearSeason] || 0) + specimenCount;
    }
    history.yearlySpecimenTotals[dateInfo.year] =
      (history.yearlySpecimenTotals[dateInfo.year] || 0) + specimenCount;

    // Update the seasonality tallies.

    const seasonality = this._seasonalityStageTallies[lifeStage];
    if (dateInfo.fortnight !== null) {
      seasonality.biweeklySpecimenTotals[dateInfo.fortnight] =
        (seasonality.biweeklySpecimenTotals[dateInfo.fortnight] || 0) + specimenCount;
    }
    if (dateInfo.month !== null) {
      seasonality.monthlySpecimenTotals[dateInfo.month] =
        (seasonality.monthlySpecimenTotals[dateInfo.month] || 0) + specimenCount;
    }
    if (dateInfo.season !== null) {
      seasonality.seasonalSpecimenTotals[dateInfo.season] =
        (seasonality.seasonalSpecimenTotals[dateInfo.season] || 0) + specimenCount;
    }
  }

  private _addTaxonTally(
    counters: (TaxonCounter | null)[],
    timeCode: number | null,
    pathSpec: TaxonPathSpec | null,
    species: string | null,
    subspecies: string | null
  ): void {
    if (timeCode !== null) {
      let counter = counters[timeCode];
      if (!counter) {
        if (pathSpec !== null) {
          counter = TaxonCounter.createFromPathSpec(pathSpec, species, subspecies);
          counters[timeCode] = counter;
        } else {
          counters[timeCode] = null; // reserve column for time code in chart
        }
      } else if (pathSpec) {
        counter.updateForPathSpec(pathSpec, species, subspecies);
      }
    }
  }
}

//// PRIVATE /////////////////////////////////////////////////////////////////

interface _DateInfo {
  year: number;
  season: number | null; // season of year, spring first, starting at 0
  month: number | null; // month of year, starting at 1
  fortnight: number | null; // fortnight of year, starting at 1
  week: number | null; // weak of year, starting at 1
  yearSeason: number | null; // year * 10 + season;
  yearMonth: number | null; // year * 100 + month;
}

// returns weeks since epoch (millis = 0), resetting each week at start of year
function _toDateInfo(date: Date, partialDate: string | null): _DateInfo {
  const [month, year] = toZonelessMonthAndYear(date);
  let seasonYear = year;
  const daysEpoch = toDaysEpoch(date);

  if (partialDate) {
    const haveMonth = partialDateHasMonth(partialDate);
    return {
      year,
      season: null,
      month: haveMonth ? month : null,
      fortnight: null,
      week: null,
      yearSeason: null,
      yearMonth: haveMonth ? year * 100 + month : null
    };
  }

  // Cache days epoch of the start of each year and the start of each season,
  // in order to hasten computation.
  let yearStartDaysEpoch = _daysEpochByYear[year];
  if (yearStartDaysEpoch === undefined) {
    yearStartDaysEpoch = toDaysEpoch(toDateFromNumbers(year, 1, 1));
    _daysEpochByYear[year] = yearStartDaysEpoch;

    const daysEpochBySeason: number[] = [];
    const leap = year % 4 == 0 && (year % 400 == 0 || year % 100 != 0) ? 1 : 0;
    daysEpochBySeason[0] = toDaysEpoch(toDateFromNumbers(year, 3, 20 + leap));
    daysEpochBySeason[1] = toDaysEpoch(toDateFromNumbers(year, 6, 21 + leap));
    daysEpochBySeason[2] = toDaysEpoch(toDateFromNumbers(year, 9, 22 + leap));
    daysEpochBySeason[3] = toDaysEpoch(toDateFromNumbers(year, 12, 21 + leap));
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

function _getSpeciesCount(counter: TaxonCounter | null): number {
  if (counter === null) return 0;
  return counter.getSpeciesCount();
}

function _roundTotals(totals: number[]): number[] {
  return totals.map((total) => Math.round(total * 10) / 10);
}
