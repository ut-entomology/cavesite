/**
 * Class LocationVisit represents a visit by a particular
 * group of people to a specific location on a single day.
 */

import type { QueryResult } from 'pg';

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import { Specimen } from '../model/specimen';
import { ComparedTaxa } from '../../shared/model';
import { getCaveObligatesMap, getCaveContainingGeneraMap } from './cave_obligates';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

type LocationVisitData = DataOf<LocationVisit>;

export interface TaxonTallies {
  kingdomNames: string;
  kingdomCounts: string;
  phylumNames: string | null;
  phylumCounts: string | null;
  classNames: string | null;
  classCounts: string | null;
  orderNames: string | null;
  orderCounts: string | null;
  familyNames: string | null;
  familyCounts: string | null;
  genusNames: string | null;
  genusCounts: string | null;
  speciesNames: string | null;
  speciesCounts: string | null;
  subspeciesNames: string | null;
  subspeciesCounts: string | null;
}

export class LocationVisit implements TaxonTallies {
  locationID: number;
  isCave: boolean;
  startDate: Date;
  startEpochDay: number;
  endDate: Date | null;
  endEpochDay: number | null;
  normalizedCollectors: string | null;
  collectorCount: number;
  kingdomNames: string;
  kingdomCounts: string;
  phylumNames: string | null;
  phylumCounts: string | null;
  classNames: string | null;
  classCounts: string | null;
  orderNames: string | null;
  orderCounts: string | null;
  familyNames: string | null;
  familyCounts: string | null;
  genusNames: string | null;
  genusCounts: string | null;
  speciesNames: string | null;
  speciesCounts: string | null;
  subspeciesNames: string | null;
  subspeciesCounts: string | null;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: LocationVisitData) {
    this.locationID = data.locationID;
    this.isCave = data.isCave;
    this.startDate = data.startDate;
    this.startEpochDay = data.startEpochDay;
    this.endDate = data.endDate;
    this.endEpochDay = data.endEpochDay;
    this.normalizedCollectors = data.normalizedCollectors;
    this.collectorCount = data.collectorCount;
    this.kingdomNames = data.kingdomNames;
    this.kingdomCounts = data.kingdomCounts;
    this.phylumNames = data.phylumNames;
    this.phylumCounts = data.phylumCounts;
    this.classNames = data.classNames;
    this.classCounts = data.classCounts;
    this.orderNames = data.orderNames;
    this.orderCounts = data.orderCounts;
    this.familyNames = data.familyNames;
    this.familyCounts = data.familyCounts;
    this.genusNames = data.genusNames;
    this.genusCounts = data.genusCounts;
    this.speciesNames = data.speciesNames;
    this.speciesCounts = data.speciesCounts;
    this.subspeciesNames = data.subspeciesNames;
    this.subspeciesCounts = data.subspeciesCounts;
  }

  //// PUBLIC INSTANCE METHODS //////////////////////////////////////////////

  async save(db: DB, comparedTaxa: ComparedTaxa): Promise<void> {
    const result = await db.query(
      `insert into ${comparedTaxa}_for_visits(
            location_id, is_cave, start_date, start_epoch_day, end_date, end_epoch_day,
            normalized_collectors, kingdom_names, kingdom_counts,
            phylum_names, phylum_counts, class_names, class_counts,
            order_names, order_counts, family_names, family_counts,
            genus_names, genus_counts, species_names, species_counts,
            subspecies_names, subspecies_counts, collector_count
					) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22, $23, $24)
          on conflict (location_id, start_epoch_day, normalized_collectors)
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
        this.normalizedCollectors,
        this.kingdomNames,
        this.kingdomCounts,
        this.phylumNames,
        this.phylumCounts,
        this.classNames,
        this.classCounts,
        this.orderNames,
        this.orderCounts,
        this.familyNames,
        this.familyCounts,
        this.genusNames,
        this.genusCounts,
        this.speciesNames,
        this.speciesCounts,
        this.subspeciesNames,
        this.subspeciesCounts,
        this.collectorCount
      ]
    );
    if (result.rowCount != 1) {
      throw Error(
        `Failed to upsert visit location ID ${this.locationID}, ` +
          `day ${this.startEpochDay}, collectors ${this.normalizedCollectors}`
      );
    }
  }

  private _updateTaxon(
    upperTaxon: string | null,
    lowerTaxon: string | null,
    visitNamesField: keyof TaxonTallies,
    visitCountsField: keyof TaxonTallies
  ): void {
    // If the taxon does not occur, there's nothing to update.

    if (upperTaxon !== null) {
      let taxonNameSeries = this[visitNamesField] as string | null;

      // If no taxa of this rank are yet recorded for the visit, assign first;
      // otherwise update the existing record.

      if (taxonNameSeries === null) {
        // @ts-ignore
        this[visitNamesField] = upperTaxon;
        // @ts-ignore
        this[visitCountsField] = lowerTaxon === null ? '1' : '0';
      } else {
        const taxonNames = taxonNameSeries.split('|');
        const taxonIndex = taxonNames.indexOf(upperTaxon);

        // If the taxon was not previously recorded, append it; otherwise,
        // drop the taxon count for this rank if it's not already 0 and
        // a taxon exists below the rank that will re-up the count.

        if (taxonIndex < 0) {
          // @ts-ignore
          this[visitNamesField] += '|' + upperTaxon;
          // @ts-ignore
          this[visitCountsField] += lowerTaxon === null ? '1' : '0';
        } else if (lowerTaxon !== null) {
          const taxonCounts = this[visitCountsField] as string;
          if (taxonCounts[taxonIndex] == '1') {
            // @ts-ignore
            this[visitCountsField] = setTaxonCounts(taxonCounts, taxonIndex, '0');
          }
        }
      }
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

    const speciesName = specimen.speciesName
      ? specimen.subspeciesName
        ? specimen.taxonUnique.substring(0, specimen.taxonUnique.lastIndexOf(' '))
        : specimen.taxonUnique
      : null;
    const subspeciesName = specimen.subspeciesName ? specimen.taxonUnique : null;

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

    const startEpochDay = Math.floor(
      specimen.collectionStartDate.getTime() / MILLIS_PER_DAY
    );

    const visit = await LocationVisit.getByKey(
      db,
      comparedTaxa,
      specimen.localityID,
      startEpochDay,
      specimen.normalizedCollectors
    );

    if (visit === null) {
      const collectors = specimen.normalizedCollectors;
      await this.create(db, comparedTaxa, {
        locationID: specimen.localityID,
        isCave: specimen.localityName.toLowerCase().includes('cave'),
        startDate: specimen.collectionStartDate,
        startEpochDay,
        endDate: specimen.collectionEndDate,
        endEpochDay: null,
        normalizedCollectors: collectors,
        collectorCount: collectors ? collectors.split('|').length : 1,
        kingdomNames: specimen.kingdomName,
        kingdomCounts: _toInitialCount(specimen.kingdomName, specimen.phylumName)!,
        phylumNames: specimen.phylumName,
        phylumCounts: _toInitialCount(specimen.phylumName, specimen.className),
        classNames: specimen.className,
        classCounts: _toInitialCount(specimen.className, specimen.orderName),
        orderNames: specimen.orderName,
        orderCounts: _toInitialCount(specimen.orderName, specimen.familyName),
        familyNames: specimen.familyName,
        familyCounts: _toInitialCount(specimen.familyName, specimen.genusName),
        genusNames: specimen.genusName,
        genusCounts: _toInitialCount(specimen.genusName, specimen.speciesName),
        speciesNames: speciesName,
        speciesCounts: _toInitialCount(specimen.speciesName, specimen.subspeciesName),
        subspeciesNames: subspeciesName,
        subspeciesCounts: _toInitialCount(specimen.subspeciesName, null)
      });
    } else {
      visit._updateTaxon(
        specimen.kingdomName,
        specimen.phylumName,
        'kingdomNames',
        'kingdomCounts'
      );
      visit._updateTaxon(
        specimen.phylumName,
        specimen.className,
        'phylumNames',
        'phylumCounts'
      );
      visit._updateTaxon(
        specimen.className,
        specimen.orderName,
        'classNames',
        'classCounts'
      );
      visit._updateTaxon(
        specimen.orderName,
        specimen.familyName,
        'orderNames',
        'orderCounts'
      );
      visit._updateTaxon(
        specimen.familyName,
        specimen.genusName,
        'familyNames',
        'familyCounts'
      );
      visit._updateTaxon(specimen.genusName, speciesName, 'genusNames', 'genusCounts');
      visit._updateTaxon(speciesName, subspeciesName, 'speciesNames', 'speciesCounts');
      visit._updateTaxon(subspeciesName, null, 'subspeciesNames', 'subspeciesCounts');

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
    const result = await db.query(
      `select * from ${comparedTaxa}_for_visits where is_cave=true
        order by location_id, start_epoch_day, normalized_collectors
        limit $1 offset $2`,
      [limit, skip]
    );
    return result.rows.map((row) => new LocationVisit(toCamelRow(row)));
  }

  static async getByKey(
    db: DB,
    comparedTaxa: ComparedTaxa,
    locationID: number,
    startEpochDay: number,
    normalizedCollectors: string | null
  ): Promise<LocationVisit | null> {
    let result: QueryResult<any>;
    const baseQuery = `select * from ${comparedTaxa}_for_visits
        where location_id=$1 and start_epoch_day=$2 and normalized_collectors`;
    if (normalizedCollectors === null) {
      result = await db.query(`${baseQuery} is null`, [locationID, startEpochDay]);
    } else {
      result = await db.query(`${baseQuery}=$3`, [
        locationID,
        startEpochDay,
        normalizedCollectors
      ]);
    }
    return result.rows.length > 0
      ? new LocationVisit(toCamelRow(result.rows[0]))
      : null;
  }
}

export function setTaxonCounts(
  taxonCounts: string,
  offset: number,
  count: string
): string {
  return `${taxonCounts.substring(0, offset)}${count}${taxonCounts.substring(
    offset + 1
  )}`;
}

function _toInitialCount(
  upperTaxon: string | null,
  lowerTaxon: string | null
): string | null {
  if (!upperTaxon) return null;
  return upperTaxon && !lowerTaxon ? '1' : '0';
}
