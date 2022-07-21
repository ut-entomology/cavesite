/**
 * Class LocationVisit represents a visit by a particular
 * group of people to a specific location on a single day.
 */

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import { Specimen } from '../model/specimen';
import { EffortFlags, ComparedTaxa, toSpeciesAndSubspecies } from '../../shared/model';
import { TaxonCounter } from '../../shared/taxon_counter';
import { getCaveObligatesMap, getCaveContainingGeneraMap } from './cave_obligates';
import { partialDateHasMonth } from '../../shared/time_query';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

type LocationVisitData = DataOf<LocationVisit>;

export class LocationVisit extends TaxonCounter {
  locationID: number;
  isCave: boolean;
  startDate: Date;
  startEpochDay: number;
  endDate: Date;
  endEpochDay: number;
  flags: EffortFlags;
  normalizedCollectors: string; // can't be null because is a key in the DB
  collectorCount: number;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: LocationVisitData) {
    super(data);
    this.locationID = data.locationID;
    this.isCave = data.isCave;
    this.startDate = data.startDate;
    this.startEpochDay = data.startEpochDay;
    this.endDate = data.endDate;
    this.endEpochDay = data.endEpochDay;
    this.flags = data.flags;
    this.normalizedCollectors = data.normalizedCollectors;
    this.collectorCount = data.collectorCount;
  }

  //// PUBLIC INSTANCE METHODS //////////////////////////////////////////////

  async save(db: DB, comparedTaxa: ComparedTaxa): Promise<void> {
    const result = await db.query(
      `insert into ${comparedTaxa}_for_visits(
            location_id, is_cave, start_date, start_epoch_day, end_date, end_epoch_day,
            flags, normalized_collectors, kingdom_names, kingdom_counts,
            phylum_names, phylum_counts, class_names, class_counts,
            order_names, order_counts, family_names, family_counts,
            genus_names, genus_counts, species_names, species_counts,
            subspecies_names, subspecies_counts, collector_count
					) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
          on conflict (location_id, end_epoch_day, normalized_collectors)
          do update set 
            is_cave=excluded.is_cave, kingdom_names=excluded.kingdom_names,
            kingdom_counts=excluded.kingdom_counts,
            phylum_names=excluded.phylum_names, phylum_counts=excluded.phylum_counts,
            class_names=excluded.class_names, class_counts=excluded.class_counts,
            order_names=excluded.order_names, order_counts=excluded.order_counts,
            family_names=excluded.family_names, family_counts=excluded.family_counts,
            genus_names=excluded.genus_names, genus_counts=excluded.genus_counts,
            species_names=excluded.species_names,
            species_counts=excluded.species_counts,
            subspecies_names=excluded.subspecies_names,
            subspecies_counts=excluded.subspecies_counts`,
      [
        this.locationID,
        // @ts-ignore
        this.isCave,
        // @ts-ignore
        this.startDate,
        this.startEpochDay,
        // @ts-ignore
        this.endDate,
        this.endEpochDay,
        this.flags,
        this.normalizedCollectors,
        TaxonCounter.toNameSeries(this.kingdomNames),
        this.kingdomCounts,
        TaxonCounter.toNameSeries(this.phylumNames),
        this.phylumCounts,
        TaxonCounter.toNameSeries(this.classNames),
        this.classCounts,
        TaxonCounter.toNameSeries(this.orderNames),
        this.orderCounts,
        TaxonCounter.toNameSeries(this.familyNames),
        this.familyCounts,
        TaxonCounter.toNameSeries(this.genusNames),
        this.genusCounts,
        TaxonCounter.toNameSeries(this.speciesNames),
        this.speciesCounts,
        TaxonCounter.toNameSeries(this.subspeciesNames),
        this.subspeciesCounts,
        this.collectorCount
      ]
    );
    if (result.rowCount != 1) {
      throw Error(
        `Failed to upsert visit location ID ${this.locationID}, ` +
          `end day ${this.endEpochDay}, collectors '${this.normalizedCollectors}'`
      );
    }
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  private static async create(
    db: DB,
    comparedTaxa: ComparedTaxa,
    data: LocationVisitData
  ): Promise<LocationVisit> {
    const visit = new LocationVisit(data);
    await visit.save(db, comparedTaxa);
    return visit;
  }

  static async addSpecimen(
    db: DB,
    comparedTaxa: ComparedTaxa,
    specimen: Specimen
  ): Promise<void> {
    if (specimen.collectionStartDate === null) {
      throw Error("Can't add visits for a specimen with no start date");
    }

    const [speciesName, subspeciesName] = toSpeciesAndSubspecies(
      specimen,
      specimen.taxonUnique
    );

    switch (comparedTaxa) {
      case ComparedTaxa.caveObligates:
        const caveObligatesMap = getCaveObligatesMap();
        if (
          !(
            (speciesName && caveObligatesMap[speciesName]) ||
            (subspeciesName && caveObligatesMap[subspeciesName]) ||
            (specimen.genusName && caveObligatesMap[specimen.genusName])
          )
        ) {
          return; // exclude non-cave obligates
        }
        break;
      case ComparedTaxa.generaHavingCaveObligates:
        const genusSansSubgenus = specimen.genusName
          ? specimen.genusName.includes('(')
            ? specimen.genusName.substring(0, specimen.genusName.indexOf('(')).trimEnd()
            : specimen.genusName
          : null;
        const caveContainingGeneraMap = getCaveContainingGeneraMap();
        if (!genusSansSubgenus || !caveContainingGeneraMap[genusSansSubgenus]) {
          return; // exclude genera that don't contain cave obligates
        }
        break;
    }

    const startEpochDay = _toEpochDay(specimen.collectionStartDate);
    let endDate = specimen.collectionEndDate || specimen.collectionStartDate;
    let endEpochDay = _toEpochDay(endDate);
    if (specimen.partialStartDate) {
      endDate = specimen.collectionStartDate;
      endEpochDay = startEpochDay;
    }

    const visit = await LocationVisit.getByKey(
      db,
      comparedTaxa,
      specimen.localityID,
      endEpochDay,
      specimen.normalizedCollectors
    );

    if (visit === null) {
      let flags = 0;
      if (specimen.collectionStartDate) {
        if (specimen.partialStartDate) {
          if (partialDateHasMonth(specimen.partialStartDate)) {
            flags |= EffortFlags.missingDayOfMonth;
          } else {
            flags |= EffortFlags.missingMonth;
          }
        }
      } else {
        flags |= EffortFlags.missingDate;
      }

      const collectors = specimen.normalizedCollectors;
      const visitData: LocationVisitData = Object.assign(
        TaxonCounter.createFromPathSpec(specimen, speciesName, subspeciesName),
        {
          locationID: specimen.localityID,
          isCave: specimen.localityName.toLowerCase().includes('cave'),
          startDate: specimen.collectionStartDate,
          startEpochDay,
          endDate,
          endEpochDay,
          flags,
          normalizedCollectors: collectors || '',
          collectorCount: collectors ? collectors.split('|').length : 1
        }
      );
      await this.create(db, comparedTaxa, visitData);
    } else {
      visit.updateForPathSpec(specimen, speciesName, subspeciesName);
      await visit.save(db, comparedTaxa);
    }
  }

  // for testing purposes...
  static async dropAll(db: DB, comparedTaxa: ComparedTaxa): Promise<void> {
    await db.query(`delete from ${comparedTaxa}_for_visits`);
  }

  static async getNextCaveBatch(
    db: DB,
    comparedTaxa: ComparedTaxa,
    skip: number,
    limit: number
  ): Promise<LocationVisit[]> {
    // Ordered first by location_id so caller can sequentially aggregrate
    // data by location. Then by end date so caller can tabulate species
    // at the time they are known. I've forgotten why I'm sorting by
    // collectors here -- this may not be necessary.
    const result = await db.query(
      `select * from ${comparedTaxa}_for_visits where is_cave=true
        order by location_id, end_epoch_day, normalized_collectors
        limit $1 offset $2`,
      [limit, skip]
    );
    return result.rows.map((row) => new LocationVisit(toCamelRow(row)));
  }

  static async getByKey(
    db: DB,
    comparedTaxa: ComparedTaxa,
    locationID: number,
    endEpochDay: number,
    normalizedCollectors: string | null
  ): Promise<LocationVisit | null> {
    let result = await db.query(
      `select * from ${comparedTaxa}_for_visits
        where location_id=$1 and end_epoch_day=$2 and normalized_collectors=$3`,
      [locationID, endEpochDay, normalizedCollectors]
    );
    return result.rows.length > 0
      ? new LocationVisit(toCamelRow(result.rows[0]))
      : null;
  }
}

function _toEpochDay(date: Date): number {
  return Math.floor(date.getTime() / MILLIS_PER_DAY);
}
