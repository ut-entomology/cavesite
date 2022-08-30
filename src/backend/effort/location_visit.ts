/**
 * Class LocationVisit represents a visit by a particular
 * group of people to a specific location on a single day.
 */

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow, toPostgresDateOrNull } from '../integrations/postgres';
import { Specimen } from '../model/specimen';
import { EffortFlags, ComparedFauna, toSpeciesAndSubspecies } from '../../shared/model';
import { TaxonCounter } from '../../shared/taxon_counter';
import { troglobiteData } from '../lib/karst_obligates';
import {
  partialDateHasMonth,
  stripTimeZoneOrNull,
  toDaysEpoch
} from '../../shared/date_tools';

const NO_DATE_EPOCH_DAY = -Math.pow(1, 9); // very negative to make first in sort

type LocationVisitData = DataOf<LocationVisit>;

export class LocationVisit extends TaxonCounter {
  locationID: number;
  isTerrestrialKarst: boolean;
  startDate: Date | null;
  startEpochDay: number | null;
  endDate: Date | null;
  endEpochDay: number;
  flags: EffortFlags;
  normalizedCollectors: string; // can't be null because is a key in the DB
  collectorCount: number;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: LocationVisitData) {
    super(data);
    this.locationID = data.locationID;
    this.isTerrestrialKarst = data.isTerrestrialKarst;
    this.startDate = stripTimeZoneOrNull(data.startDate);
    this.startEpochDay = data.startEpochDay;
    this.endDate = stripTimeZoneOrNull(data.endDate);
    this.endEpochDay = data.endEpochDay;
    this.flags = data.flags;
    this.normalizedCollectors = data.normalizedCollectors;
    this.collectorCount = data.collectorCount;
  }

  //// PUBLIC INSTANCE METHODS //////////////////////////////////////////////

  async save(db: DB, comparedFauna: ComparedFauna): Promise<void> {
    //console.log('**** isTerrestrialKarst', this.isTerrestrialKarst);
    const result = await db.query(
      `insert into ${comparedFauna}_for_visits(
            location_id, is_terrestrial_karst,
            start_date, start_epoch_day, end_date, end_epoch_day,
            flags, normalized_collectors, kingdom_names, kingdom_counts,
            phylum_names, phylum_counts, class_names, class_counts,
            order_names, order_counts, family_names, family_counts,
            genus_names, genus_counts, species_names, species_counts,
            subspecies_names, subspecies_counts, collector_count
					) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
          on conflict (location_id, end_epoch_day, normalized_collectors)
          do update set 
          is_terrestrial_karst=excluded.is_terrestrial_karst,
            kingdom_names=excluded.kingdom_names, kingdom_counts=excluded.kingdom_counts,
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
        this.isTerrestrialKarst,
        toPostgresDateOrNull(this.startDate),
        this.startEpochDay,
        toPostgresDateOrNull(this.endDate),
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

  static async commit(db: DB, comparedFauna: ComparedFauna): Promise<void> {
    await db.query(`delete from ${comparedFauna}_for_visits where committed=true`);
    await db.query(`update ${comparedFauna}_for_visits set committed=true`);
  }

  private static async create(
    db: DB,
    comparedFauna: ComparedFauna,
    data: LocationVisitData
  ): Promise<LocationVisit> {
    const visit = new LocationVisit(data);
    await visit.save(db, comparedFauna);
    return visit;
  }

  static async addSpecimen(
    db: DB,
    comparedFauna: ComparedFauna,
    specimen: Specimen
  ): Promise<void> {
    const [speciesName, subspeciesName] = toSpeciesAndSubspecies(
      specimen,
      specimen.taxonUnique
    );

    switch (comparedFauna) {
      case ComparedFauna.caveObligates:
        const troglobitesMap = await troglobiteData.getMap(db);
        if (
          !(
            (speciesName && troglobitesMap[speciesName]) ||
            (subspeciesName && troglobitesMap[subspeciesName]) ||
            (specimen.genusName && troglobitesMap[specimen.genusName]) ||
            (specimen.subgenus && troglobitesMap[specimen.subgenus])
          )
        ) {
          return; // exclude non-troglobites
        }
        break;
      case ComparedFauna.generaHavingCaveObligates:
        const troglobitesGeneraMap = await troglobiteData.getContainingGeneraMap(db);
        if (!specimen.genusName || !troglobitesGeneraMap[specimen.genusName]) {
          return; // exclude genera that don't contain troglobites
        }
        break;
    }

    let startEpochDay: number | null = null;
    let endDate: Date | null = null;
    let endEpochDay = NO_DATE_EPOCH_DAY;

    if (specimen.collectionStartDate) {
      startEpochDay = toDaysEpoch(specimen.collectionStartDate);
      endDate = specimen.collectionEndDate || specimen.collectionStartDate;
      endEpochDay = toDaysEpoch(endDate);
      if (specimen.partialStartDate) {
        endDate = specimen.collectionStartDate;
        endEpochDay = startEpochDay;
      }
    }

    const visit = await LocationVisit.getByKey(
      db,
      comparedFauna,
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
          isTerrestrialKarst: specimen.isTerrestrialKarst,
          startDate: specimen.collectionStartDate,
          startEpochDay,
          endDate,
          endEpochDay,
          flags,
          normalizedCollectors: collectors || '',
          collectorCount: collectors ? collectors.split('|').length : 1
        }
      );
      //console.log('**** visitData', visitData);
      // try {
      await this.create(db, comparedFauna, visitData);
      //   console.log('**** created visit');
      // } catch (err: any) {
      //   console.log('**** error', err);
      // }
      // process.exit(1);
    } else {
      visit.updateForPathSpec(specimen, speciesName, subspeciesName);
      await visit.save(db, comparedFauna);
    }
  }

  static async assignKarstLocations(db: DB, locationIDs: number[]): Promise<void> {
    for (const comparedFauna of Object.values(ComparedFauna)) {
      await db.query(
        `update ${comparedFauna}_for_visits set is_terrestrial_karst=true where location_id=any ($1)`,
        [
          // @ts-ignore
          locationIDs
        ]
      );
    }
  }

  // for testing purposes...
  static async dropAll(db: DB, comparedFauna: ComparedFauna): Promise<void> {
    await db.query(`delete from ${comparedFauna}_for_visits`);
  }

  static async getNextKarstBatch(
    db: DB,
    comparedFauna: ComparedFauna,
    skip: number,
    limit: number
  ): Promise<LocationVisit[]> {
    // Ordered first by location_id so caller can sequentially aggregrate
    // data by location. Then by end date so caller can tabulate species
    // at the time they are known. I've forgotten why I'm sorting by
    // collectors here -- this may not be necessary.
    const result = await db.query(
      `select * from ${comparedFauna}_for_visits
        where is_terrestrial_karst=true and committed=false
        order by location_id, end_epoch_day, normalized_collectors
        limit $1 offset $2`,
      [limit, skip]
    );
    return result.rows.map((row) => new LocationVisit(toCamelRow(row)));
  }

  static async getByKey(
    db: DB,
    comparedFauna: ComparedFauna,
    locationID: number,
    endEpochDay: number,
    normalizedCollectors: string | null
  ): Promise<LocationVisit | null> {
    let result = await db.query(
      `select * from ${comparedFauna}_for_visits
        where location_id=$1 and end_epoch_day=$2 and normalized_collectors=$3
          and committed=false`,
      [locationID, endEpochDay, normalizedCollectors]
    );
    return result.rows.length > 0
      ? new LocationVisit(toCamelRow(result.rows[0]))
      : null;
  }
}
