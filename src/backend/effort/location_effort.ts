/**
 * Class LocationEffort represents the findings across all
 * available data for any given location.
 */

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import { TaxonTallies, LocationVisit, setTaxonCounts } from './location_visit';
import { ComparedTaxa } from '../../shared/model';

const VISIT_BATCH_SIZE = 200;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS_TREATED_AS_PER_PERSON = 3;
const PITFALL_TRAP_DAYS_PER_VISIT = 3;

export type EffortData = Pick<
  DataOf<LocationEffort>,
  | 'startDate'
  | 'endDate'
  | 'totalDays'
  | 'totalVisits'
  | 'totalPersonVisits'
  | 'totalSpecies'
  | 'perDayPoints'
  | 'perVisitPoints'
  | 'perPersonVisitPoints'
>;

export class LocationEffort {
  locationID: number;
  isCave: boolean;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalVisits: number;
  totalPersonVisits: number;
  totalSpecies: number;
  kingdomNames: string;
  phylumNames: string | null;
  classNames: string | null;
  orderNames: string | null;
  familyNames: string | null;
  genusNames: string | null;
  speciesNames: string | null;
  subspeciesNames: string | null;
  perDayPoints: string;
  perVisitPoints: string;
  perPersonVisitPoints: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: DataOf<LocationEffort>) {
    this.locationID = data.locationID;
    this.isCave = data.isCave;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.totalDays = data.totalDays;
    this.totalVisits = data.totalVisits;
    this.totalPersonVisits = data.totalPersonVisits;
    this.totalSpecies = data.totalSpecies;
    this.kingdomNames = data.kingdomNames;
    this.phylumNames = data.phylumNames;
    this.classNames = data.classNames;
    this.orderNames = data.orderNames;
    this.familyNames = data.familyNames;
    this.genusNames = data.genusNames;
    this.speciesNames = data.speciesNames;
    this.subspeciesNames = data.subspeciesNames;
    this.perDayPoints = data.perDayPoints;
    this.perVisitPoints = data.perVisitPoints;
    this.perPersonVisitPoints = data.perPersonVisitPoints;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async create(
    db: DB,
    comparedTaxa: ComparedTaxa,
    locationID: number,
    isCave: boolean,
    data: EffortData,
    tallies: TaxonTallies
  ): Promise<LocationEffort> {
    const effort = new LocationEffort(
      Object.assign({ locationID, isCave }, tallies, data)
    );
    const result = await db.query(
      `insert into ${comparedTaxa}_for_effort (
            location_id, is_cave, start_date, end_date, total_days,
            total_visits, total_person_visits, total_species, kingdom_names,
            phylum_names, class_names, order_names, family_names,
            genus_names, species_names, subspecies_names,
            per_day_points, per_visit_points, per_person_visit_points
					) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18, $19)`,
      [
        effort.locationID,
        // @ts-ignore
        effort.isCave,
        // @ts-ignore
        effort.startDate,
        // @ts-ignore
        effort.endDate,
        effort.totalDays,
        effort.totalVisits,
        effort.totalPersonVisits,
        effort.totalSpecies,
        effort.kingdomNames,
        effort.phylumNames,
        effort.classNames,
        effort.orderNames,
        effort.familyNames,
        effort.genusNames,
        effort.speciesNames,
        effort.subspeciesNames,
        effort.perDayPoints,
        effort.perVisitPoints,
        effort.perPersonVisitPoints
      ]
    );
    if (result.rowCount != 1) {
      throw Error(`Failed to effort for location ID ${effort.locationID}`);
    }
    return effort;
  }

  // for testing purposes...
  static async dropAll(db: DB, comparedTaxa: ComparedTaxa): Promise<void> {
    await db.query(`delete from ${comparedTaxa}_for_effort`);
  }

  static async getByLocationIDs(
    db: DB,
    comparedTaxa: ComparedTaxa,
    locationIDs: number[]
  ): Promise<LocationEffort[]> {
    const result = await db.query(
      `select * from ${comparedTaxa}_for_effort where location_id=any ($1)`,
      [
        // @ts-ignore
        locationIDs
      ]
    );
    return result.rows.map((row) => new LocationEffort(toCamelRow(row)));
  }

  static async getNextBatch(
    db: DB,
    comparedTaxa: ComparedTaxa,
    minSpecies: number,
    maxSpecies: number,
    skip: number,
    limit: number
  ): Promise<LocationEffort[]> {
    const result = await db.query(
      `select * from ${comparedTaxa}_for_effort where total_species between $1 and $2
        order by total_species desc, location_id limit $3 offset $4`,
      [minSpecies, maxSpecies, limit, skip]
    );
    return result.rows.map((row) => new LocationEffort(toCamelRow(row)));
  }

  static async tallyEffort(db: DB, comparedTaxa: ComparedTaxa): Promise<void> {
    let priorLocationID = 0;
    let startDate: Date;
    let endDate: Date;
    let tallies: LocationVisit;
    let firstEpochDay = 0;
    let totalDays = 0;
    let totalSpecies = 0;
    let totalVisits = 0;
    let totalPersonVisits = 0;
    let perDayPoints: number[][] = [];
    let perVisitPoints: number[][] = [];
    let perPersonVisitPoints: number[][] = [];
    let skipCount = 0;

    let visits = await LocationVisit.getNextCaveBatch(
      db,
      comparedTaxa,
      skipCount,
      VISIT_BATCH_SIZE
    );
    while (visits.length > 0) {
      // Visits are ordered first by locationID then by end date and collectors.

      for (const visit of visits) {
        if (visit.locationID != priorLocationID) {
          if (priorLocationID != 0) {
            await this.create(
              db,
              comparedTaxa,
              tallies!.locationID,
              tallies!.isCave,
              {
                startDate: startDate!,
                endDate: endDate!,
                totalDays,
                totalVisits,
                totalPersonVisits,
                totalSpecies,
                perDayPoints: JSON.stringify(perDayPoints),
                perVisitPoints: JSON.stringify(perVisitPoints),
                perPersonVisitPoints: JSON.stringify(perPersonVisitPoints)
              },
              tallies!
            );
          }
          startDate = visit.startDate;
          firstEpochDay = visit.startEpochDay;
          tallies = visit; // okay to overwrite the visit
          totalVisits = 0;
          totalPersonVisits = 0;
          perDayPoints = [];
          perVisitPoints = [];
          perPersonVisitPoints = [];
          priorLocationID = visit.locationID;
        } else {
          this._mergeVisit(tallies!, visit);
        }

        endDate = visit.endDate || visit.startDate;
        const spanInDays =
          Math.round(
            (visit.endDate!.getTime() - visit.startDate.getTime()) / MILLIS_PER_DAY
          ) + 1;

        totalSpecies = this._countSpecies(tallies!);
        totalDays = visit.endEpochDay - firstEpochDay + 1;

        if (spanInDays <= MAX_DAYS_TREATED_AS_PER_PERSON) {
          // treat as individually collected each day
          totalVisits += spanInDays;
          totalPersonVisits += spanInDays * visit.collectorCount;
        } else {
          // treat as a pitfall trap
          const visitEquivalent = Math.ceil(spanInDays / PITFALL_TRAP_DAYS_PER_VISIT);
          totalVisits += visitEquivalent;
          totalPersonVisits += visitEquivalent;
        }

        perDayPoints.push([totalDays, totalSpecies]);
        perVisitPoints.push([totalVisits, totalSpecies]);
        perPersonVisitPoints.push([totalPersonVisits, totalSpecies]);
      }

      skipCount += visits.length;
      visits = await LocationVisit.getNextCaveBatch(
        db,
        comparedTaxa,
        skipCount,
        VISIT_BATCH_SIZE
      );
    }

    if (priorLocationID != 0) {
      await this.create(
        db,
        comparedTaxa,
        tallies!.locationID,
        tallies!.isCave,
        {
          // @ts-ignore
          startDate,
          endDate: endDate!,
          totalDays,
          totalVisits,
          totalPersonVisits,
          totalSpecies,
          perDayPoints: JSON.stringify(perDayPoints),
          perVisitPoints: JSON.stringify(perVisitPoints),
          perPersonVisitPoints: JSON.stringify(perPersonVisitPoints)
        },
        tallies!
      );
    }
  }

  //// PRIVATE CLASS METHODS ///////////////////////////////////////////////

  private static _countSpecies(tallies: TaxonTallies): number {
    let count = _countOnes(tallies.kingdomCounts);
    count += _countOnes(tallies.phylumCounts);
    count += _countOnes(tallies.classCounts);
    count += _countOnes(tallies.orderCounts);
    count += _countOnes(tallies.familyCounts);
    count += _countOnes(tallies.genusCounts);
    count += _countOnes(tallies.speciesCounts);
    count += _countOnes(tallies.subspeciesCounts);
    return count;
  }

  private static _mergeTaxa(
    tallies: TaxonTallies,
    visit: LocationVisit,
    namesField: keyof TaxonTallies,
    countsField: keyof TaxonTallies
  ): void {
    // Only merge visit values when they exist for the taxon.

    const visitTaxonSeries = visit[namesField];
    if (visitTaxonSeries !== null) {
      // If the tally doesn't currently represent the visit taxon, copy over
      // the visit values for the taxon; otherwise, merge the visit values.

      const tallyTaxonSeries = tallies[namesField];
      if (tallyTaxonSeries === null) {
        tallies[namesField] = visitTaxonSeries;
        tallies[countsField] = visit[countsField]!;
      } else {
        const tallyTaxa = tallyTaxonSeries.split('|');
        const visitTaxa = visitTaxonSeries.split('|');
        const visitCounts = visit[countsField]!;

        // Separately merge each visit taxon.

        for (let visitIndex = 0; visitIndex < visitTaxa.length; ++visitIndex) {
          const visitTaxon = visitTaxa[visitIndex];
          const tallyIndex = tallyTaxa.indexOf(visitTaxon);

          if (visitCounts[visitIndex] == '0') {
            // When the visit count is 0, a lower taxon provides more specificity,
            // so the tally must indicate a 0 count for the taxon.

            if (tallyIndex < 0) {
              tallies[namesField] += '|' + visitTaxon;
              tallies[countsField] += '0';
            } else {
              const taxonCounts = tallies[countsField]!;
              if (taxonCounts[tallyIndex] == '1') {
                tallies[countsField] = setTaxonCounts(taxonCounts, tallyIndex, '0');
              }
            }
          } else {
            // When the visit count is 1, the visit provides no more specificity,
            // so the tally must indicate a 1 if a tally is not already present.

            if (tallyIndex < 0) {
              tallies[namesField] += '|' + visitTaxon;
              tallies[countsField] += '1';
            }
          }
        }
      }
    }
  }

  private static _mergeVisit(tallies: TaxonTallies, visit: LocationVisit): void {
    this._mergeTaxa(tallies, visit, 'kingdomNames', 'kingdomCounts');
    this._mergeTaxa(tallies, visit, 'phylumNames', 'phylumCounts');
    this._mergeTaxa(tallies, visit, 'classNames', 'classCounts');
    this._mergeTaxa(tallies, visit, 'orderNames', 'orderCounts');
    this._mergeTaxa(tallies, visit, 'familyNames', 'familyCounts');
    this._mergeTaxa(tallies, visit, 'genusNames', 'genusCounts');
    this._mergeTaxa(tallies, visit, 'speciesNames', 'speciesCounts');
    this._mergeTaxa(tallies, visit, 'subspeciesNames', 'subspeciesCounts');
  }
}

function _countOnes(s: string | null): number {
  if (s === null) return 0;
  return s.replaceAll('0', '').length;
}
