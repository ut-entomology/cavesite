/**
 * Class LocationEffort represents a summary of data for a given location.
 */

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import { Location } from '../model/location';
import { LocationVisit } from './location_visit';
import { TaxonCounter } from '../../shared/taxon_counter';
import { TaxonVisitCounter, type TaxonVisitCounterData } from './taxon_visit_counter';
import {
  MAX_DAYS_TREATED_AS_PER_PERSON,
  TRAP_DAYS_PER_VISIT,
  EffortFlags,
  ComparedFauna,
  LocationRankIndex
} from '../../shared/model';

const VISIT_BATCH_SIZE = 200;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

export type LocationEffortData = Pick<
  DataOf<LocationEffort>,
  | 'flags'
  | 'totalVisits'
  | 'totalPersonVisits'
  | 'totalSpecies'
  | 'perVisitPoints'
  | 'perPersonVisitPoints'
>;

interface LocationInfo {
  locationID: number;
  countyName: string | null;
  localityName: string;
  isCave: boolean;
  latitude: number | null;
  longitude: number | null;
}

export class LocationEffort {
  locationID: number;
  countyName: string | null;
  localityName: string;
  isCave: boolean;
  latitude: number | null;
  longitude: number | null;
  flags: EffortFlags;
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
  totalVisits: number;
  totalPersonVisits: number;
  totalSpecies: number;
  recentTaxa: string;
  perVisitPoints: string;
  perPersonVisitPoints: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: DataOf<LocationEffort>) {
    this.locationID = data.locationID;
    this.countyName = data.countyName;
    this.localityName = data.localityName;
    this.isCave = data.isCave;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.flags = data.flags;
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
    this.totalVisits = data.totalVisits;
    this.totalPersonVisits = data.totalPersonVisits;
    this.totalSpecies = data.totalSpecies;
    this.perVisitPoints = data.perVisitPoints;
    this.perPersonVisitPoints = data.perPersonVisitPoints;
    this.recentTaxa = data.recentTaxa;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async commit(db: DB, comparedFauna: ComparedFauna): Promise<void> {
    await db.query(`delete from ${comparedFauna}_for_effort where committed=true`);
    await db.query(`update ${comparedFauna}_for_effort set committed=true`);
  }

  static async create(
    db: DB,
    comparedFauna: ComparedFauna,
    locationInfo: LocationInfo,
    data: LocationEffortData,
    counterData: TaxonVisitCounterData
  ): Promise<LocationEffort> {
    const effort = new LocationEffort(
      Object.assign(
        {
          locationID: locationInfo.locationID,
          countyName: locationInfo.countyName,
          localityName: locationInfo.localityName,
          isCave: locationInfo.isCave,
          latitude: locationInfo.latitude,
          longitude: locationInfo.longitude,
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
          ),
          recentTaxa: TaxonVisitCounter.toRecentTaxaSeries(counterData.recentTaxa)
        },
        counterData,
        data
      )
    );
    const result = await db.query(
      `insert into ${comparedFauna}_for_effort (
            location_id, county_name, locality_name, is_cave, latitude, longitude,
            flags, total_visits, total_person_visits, total_species,
            kingdom_names, kingdom_visits, phylum_names, phylum_visits,
            class_names, class_visits, order_names, order_visits,
            family_names, family_visits, genus_names, genus_visits,
            species_names, species_visits, subspecies_names, subspecies_visits,
            per_visit_points, per_person_visit_points, recent_taxa
					) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`,
      [
        effort.locationID,
        effort.countyName,
        effort.localityName,
        // @ts-ignore
        effort.isCave,
        effort.latitude,
        effort.longitude,
        effort.flags,
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
        TaxonCounter.toNameSeries(effort.perVisitPoints),
        TaxonCounter.toNameSeries(effort.perPersonVisitPoints),
        TaxonVisitCounter.toRecentTaxaSeries(effort.recentTaxa)
      ]
    );
    if (result.rowCount != 1) {
      throw Error(`Failed to effort for location ID ${effort.locationID}`);
    }
    return effort;
  }

  // for testing purposes...
  static async dropAll(db: DB, comparedFauna: ComparedFauna): Promise<void> {
    await db.query(`delete from ${comparedFauna}_for_effort`);
  }

  static async getByLocationIDs(
    db: DB,
    comparedFauna: ComparedFauna,
    locationIDs: number[],
    committed: boolean = true
  ): Promise<LocationEffort[]> {
    const result = await db.query(
      `select * from ${comparedFauna}_for_effort
        where location_id=any ($1) and committed=$2`,
      [
        // @ts-ignore
        locationIDs,
        // @ts-ignore
        committed
      ]
    );
    return result.rows.map((row) => new LocationEffort(toCamelRow(row)));
  }

  static async getNextBatch(
    db: DB,
    comparedFauna: ComparedFauna,
    minSpecies: number,
    maxSpecies: number,
    skip: number,
    limit: number
  ): Promise<LocationEffort[]> {
    const result = await db.query(
      `select * from ${comparedFauna}_for_effort
        where total_species between $1 and $2 and committed=true
        order by total_species desc, location_id limit $3 offset $4`,
      [minSpecies, maxSpecies, limit, skip]
    );
    return result.rows.map((row) => new LocationEffort(toCamelRow(row)));
  }

  static async tallyEffort(db: DB, comparedFauna: ComparedFauna): Promise<void> {
    let priorLocationID = 0;
    let startDate: Date | null = null;
    let effortFlags: EffortFlags;
    let firstVisitOfLocation: LocationVisit;
    let taxonVisitCounter: TaxonVisitCounter;
    let priorTotalSpecies = 0;
    let totalSpecies = 0;
    let totalVisits = 0;
    let totalPersonVisits = 0;
    let perVisitPoints: number[][] = [];
    let perPersonVisitPoints: number[][] = [];
    let skipCount = 0;

    let visits = await LocationVisit.getNextCaveBatch(
      db,
      comparedFauna,
      skipCount,
      VISIT_BATCH_SIZE
    );
    while (visits.length > 0) {
      // Visits are ordered first by locationID then by end date and collectors.

      for (const visit of visits) {
        if (visit.locationID != priorLocationID) {
          if (priorLocationID != 0) {
            const locationID = firstVisitOfLocation!.locationID;
            const [location, countyName] = await _getLocationWithCounty(db, locationID);

            await this.create(
              db,
              comparedFauna,
              {
                locationID,
                countyName,
                localityName: location.locationName,
                isCave: firstVisitOfLocation!.isCave,
                latitude: location.latitude,
                longitude: location.longitude
              },
              {
                flags: effortFlags!,
                totalVisits,
                totalPersonVisits,
                totalSpecies,
                perVisitPoints: JSON.stringify(perVisitPoints),
                perPersonVisitPoints: JSON.stringify(perPersonVisitPoints)
              },
              taxonVisitCounter!
            );
          }
          startDate = visit.startDate;
          priorTotalSpecies = 0;
          effortFlags = 0;
          firstVisitOfLocation = visit;
          taxonVisitCounter = new TaxonVisitCounter(
            TaxonVisitCounter.addInitialVisits(visit, visit)
          );
          totalVisits = 0;
          totalPersonVisits = 0;
          perVisitPoints = [];
          perPersonVisitPoints = [];
          priorLocationID = visit.locationID;
        } else {
          taxonVisitCounter!.mergeCounter(visit);
        }

        let spanInDays = 1;
        if (visit.startDate !== null) {
          spanInDays =
            Math.round(
              (visit.endDate!.getTime() - visit.startDate.getTime()) / MILLIS_PER_DAY
            ) + 1;
        }
        if (!startDate) startDate = visit.startDate;
        effortFlags! |= visit.flags;

        priorTotalSpecies = totalSpecies;
        totalSpecies = taxonVisitCounter!.getSpeciesCount();

        if (spanInDays <= MAX_DAYS_TREATED_AS_PER_PERSON) {
          // treat as individually collected each day
          totalVisits += spanInDays;
          totalPersonVisits += spanInDays * visit.collectorCount;
          if (spanInDays > 1) effortFlags! |= EffortFlags.multiDayPersonVisit;
          perVisitPoints.push([totalVisits, totalSpecies]);
          perPersonVisitPoints.push([totalPersonVisits, totalSpecies]);
        } else {
          // treat as a trap
          const visitEquivalent = Math.ceil(spanInDays / TRAP_DAYS_PER_VISIT);
          for (let i = 1; i <= visitEquivalent; ++i) {
            ++totalVisits;
            ++totalPersonVisits;
            let speciesCount =
              priorTotalSpecies +
              Math.round((i * (totalSpecies - priorTotalSpecies)) / visitEquivalent);
            perVisitPoints.push([totalVisits, speciesCount]);
            perPersonVisitPoints.push([totalPersonVisits, speciesCount]);
          }
          effortFlags! |= EffortFlags.trap;
        }
      }

      skipCount += visits.length;
      visits = await LocationVisit.getNextCaveBatch(
        db,
        comparedFauna,
        skipCount,
        VISIT_BATCH_SIZE
      );
    }

    if (priorLocationID != 0) {
      const locationID = firstVisitOfLocation!.locationID;
      const [location, countyName] = await _getLocationWithCounty(db, locationID);

      await this.create(
        db,
        comparedFauna,
        {
          locationID,
          countyName,
          localityName: location.locationName,
          isCave: firstVisitOfLocation!.isCave,
          latitude: location.latitude,
          longitude: location.longitude
        },
        {
          flags: effortFlags!,
          totalVisits,
          totalPersonVisits,
          totalSpecies,
          perVisitPoints: JSON.stringify(perVisitPoints),
          perPersonVisitPoints: JSON.stringify(perPersonVisitPoints)
        },
        taxonVisitCounter!
      );
    }
  }
}

async function _getLocationWithCounty(
  db: DB,
  locationID: number
): Promise<[Location, string | null]> {
  const location = (await Location.getByIDs(db, [locationID]))[0];
  const countyName =
    location.parentNamePath.split('|')[LocationRankIndex.County] || null;
  return [location, countyName];
}
