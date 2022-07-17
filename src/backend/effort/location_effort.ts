/**
 * Class LocationEffort represents the findings across all
 * available data for any given location.
 */

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import { Location } from '../model/location';
import { LocationVisit } from './location_visit';
import { TaxonCounter } from '../../shared/taxon_counter';
import { TaxonVisitCounter, type TaxonVisitCounterData } from './taxon_visit_counter';
import { ComparedTaxa, LocationRankIndex } from '../../shared/model';

const VISIT_BATCH_SIZE = 200;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS_TREATED_AS_PER_PERSON = 3;
const PITFALL_TRAP_DAYS_PER_VISIT = 3;

export type LocationEffortData = Pick<
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
  countyName: string | null;
  localityName: string;
  isCave: boolean;
  startDate: Date;
  endDate: Date;
  kingdomNames: string;
  kingdomVisits: string;
  phylumNames: string | null;
  phylumVisits: string | null;
  classNames: string | null;
  classVisits: string | null;
  orderNames: string | null;
  orderVisits: string | null;
  familyNames: string | null;
  familyVisits: string | null;
  genusNames: string | null;
  genusVisits: string | null;
  speciesNames: string | null;
  speciesVisits: string | null;
  subspeciesNames: string | null;
  subspeciesVisits: string | null;
  totalDays: number;
  totalVisits: number;
  totalPersonVisits: number;
  totalSpecies: number;
  perDayPoints: string;
  perVisitPoints: string;
  perPersonVisitPoints: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: DataOf<LocationEffort>) {
    this.locationID = data.locationID;
    this.countyName = data.countyName;
    this.localityName = data.localityName;
    this.isCave = data.isCave;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.kingdomNames = data.kingdomNames;
    this.kingdomVisits = data.kingdomVisits;
    this.phylumNames = data.phylumNames;
    this.phylumVisits = data.phylumVisits;
    this.classNames = data.classNames;
    this.classVisits = data.classVisits;
    this.orderNames = data.orderNames;
    this.orderVisits = data.orderVisits;
    this.familyNames = data.familyNames;
    this.familyVisits = data.familyVisits;
    this.genusNames = data.genusNames;
    this.genusVisits = data.genusVisits;
    this.speciesNames = data.speciesNames;
    this.speciesVisits = data.speciesVisits;
    this.subspeciesNames = data.subspeciesNames;
    this.subspeciesVisits = data.subspeciesVisits;
    this.totalDays = data.totalDays;
    this.totalVisits = data.totalVisits;
    this.totalPersonVisits = data.totalPersonVisits;
    this.totalSpecies = data.totalSpecies;
    this.perDayPoints = data.perDayPoints;
    this.perVisitPoints = data.perVisitPoints;
    this.perPersonVisitPoints = data.perPersonVisitPoints;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async create(
    db: DB,
    comparedTaxa: ComparedTaxa,
    locationID: number,
    countyName: string | null,
    localityName: string,
    isCave: boolean,
    data: LocationEffortData,
    counterData: TaxonVisitCounterData
  ): Promise<LocationEffort> {
    const effort = new LocationEffort(
      Object.assign(
        {
          locationID,
          countyName,
          localityName,
          isCave,
          kingdomNames: TaxonCounter.toNameSeries(counterData.kingdomNames)!,
          kingdomVisits: TaxonVisitCounter.toVisitsSeries(counterData.kingdomVisits)!,
          phylumNames: TaxonCounter.toNameSeries(counterData.phylumNames),
          phylumVisits: TaxonVisitCounter.toVisitsSeries(counterData.phylumVisits),
          classNames: TaxonCounter.toNameSeries(counterData.classNames),
          classVisits: TaxonVisitCounter.toVisitsSeries(counterData.classVisits),
          orderNames: TaxonCounter.toNameSeries(counterData.orderNames),
          orderVisits: TaxonVisitCounter.toVisitsSeries(counterData.orderVisits),
          familyNames: TaxonCounter.toNameSeries(counterData.familyNames),
          familyVisits: TaxonVisitCounter.toVisitsSeries(counterData.familyVisits),
          genusNames: TaxonCounter.toNameSeries(counterData.genusNames),
          genusVisits: TaxonVisitCounter.toVisitsSeries(counterData.genusVisits),
          speciesNames: TaxonCounter.toNameSeries(counterData.speciesNames),
          speciesVisits: TaxonVisitCounter.toVisitsSeries(counterData.speciesVisits),
          subspeciesNames: TaxonCounter.toNameSeries(counterData.subspeciesNames),
          subspeciesVisits: TaxonVisitCounter.toVisitsSeries(
            counterData.subspeciesVisits
          )
        },
        counterData,
        data
      )
    );
    const result = await db.query(
      `insert into ${comparedTaxa}_for_effort (
            location_id, county_name, locality_name, is_cave, start_date, end_date,
            total_days, total_visits, total_person_visits, total_species,
            kingdom_names, kingdom_visits, phylum_names, phylum_visits,
            class_names, class_visits, order_names, order_visits,
            family_names, family_visits, genus_names, genus_visits,
            species_names, species_visits, subspecies_names, subspecies_visits,
            per_day_points, per_visit_points, per_person_visit_points
					) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`,
      [
        effort.locationID,
        effort.countyName,
        effort.localityName,
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
        TaxonCounter.toNameSeries(effort.kingdomNames),
        TaxonVisitCounter.toVisitsSeries(effort.kingdomVisits),
        TaxonCounter.toNameSeries(effort.phylumNames),
        TaxonVisitCounter.toVisitsSeries(effort.phylumVisits),
        TaxonCounter.toNameSeries(effort.classNames),
        TaxonVisitCounter.toVisitsSeries(effort.classVisits),
        TaxonCounter.toNameSeries(effort.orderNames),
        TaxonVisitCounter.toVisitsSeries(effort.orderVisits),
        TaxonCounter.toNameSeries(effort.familyNames),
        TaxonVisitCounter.toVisitsSeries(effort.familyVisits),
        TaxonCounter.toNameSeries(effort.genusNames),
        TaxonVisitCounter.toVisitsSeries(effort.genusVisits),
        TaxonCounter.toNameSeries(effort.speciesNames),
        TaxonVisitCounter.toVisitsSeries(effort.speciesVisits),
        TaxonCounter.toNameSeries(effort.subspeciesNames),
        TaxonVisitCounter.toVisitsSeries(effort.subspeciesVisits),
        TaxonCounter.toNameSeries(effort.perDayPoints),
        TaxonCounter.toNameSeries(effort.perVisitPoints),
        TaxonCounter.toNameSeries(effort.perPersonVisitPoints)
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
    let firstVisitOfLocation: LocationVisit;
    let taxonVisitCounter: TaxonVisitCounter;
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
            const locationID = firstVisitOfLocation!.locationID;
            const [countyName, locationName] = await _getCountyAndLocality(
              db,
              locationID
            );

            await this.create(
              db,
              comparedTaxa,
              locationID,
              countyName,
              locationName,
              firstVisitOfLocation!.isCave,
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
              taxonVisitCounter!
            );
          }
          startDate = visit.startDate;
          firstEpochDay = visit.startEpochDay;
          firstVisitOfLocation = visit;
          taxonVisitCounter = new TaxonVisitCounter(
            TaxonVisitCounter.addInitialVisits(visit, visit)
          );
          totalVisits = 0;
          totalPersonVisits = 0;
          perDayPoints = [];
          perVisitPoints = [];
          perPersonVisitPoints = [];
          priorLocationID = visit.locationID;
        } else {
          taxonVisitCounter!.mergeCounter(visit);
        }

        endDate = visit.endDate || visit.startDate;
        const spanInDays =
          Math.round(
            (visit.endDate!.getTime() - visit.startDate.getTime()) / MILLIS_PER_DAY
          ) + 1;

        totalSpecies = taxonVisitCounter!.getSpeciesCount();
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
      const locationID = firstVisitOfLocation!.locationID;
      const [countyName, locationName] = await _getCountyAndLocality(db, locationID);

      await this.create(
        db,
        comparedTaxa,
        locationID,
        countyName,
        locationName,
        firstVisitOfLocation!.isCave,
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
        taxonVisitCounter!
      );
    }
  }
}

async function _getCountyAndLocality(
  db: DB,
  locationID: number
): Promise<[string | null, string]> {
  const location = (await Location.getByIDs(db, [locationID]))[0];
  const countyName =
    location.parentNamePath.split('|')[LocationRankIndex.County] || null;
  return [countyName, location.locationName];
}
