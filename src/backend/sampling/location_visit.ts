/**
 * Class LocationVisit represents a visit by a particular
 * group of people to a specific location on a single day.
 */

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import { Specimen } from '../model/specimen';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

type LocationVisitData = DataOf<LocationVisit>;

export class LocationVisit {
  locationID: number;
  isCave: boolean;
  startEpochDay: number;
  endEpochDay: number | null;
  normalizedCollectors: string;
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
    this.startEpochDay = data.startEpochDay;
    this.endEpochDay = data.endEpochDay;
    this.normalizedCollectors = data.normalizedCollectors;
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

  async save(db: DB): Promise<void> {
    const result = await db.query(
      `insert into visits(
            location_id, is_cave, start_epoch_day, end_epoch_day,
            normalized_collectors, kingdom_names, kingdom_counts,
            phylum_names, phylum_counts, class_names, class_counts,
            order_names, order_counts, family_names, family_counts,
            genus_names, genus_counts, species_names, species_counts,
            subspecies_names, subspecies_counts
					) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21)
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
        this.startEpochDay,
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
        this.subspeciesCounts
      ]
    );
    if (result.rowCount != 1) {
      throw Error(
        `Failed to upsert visit location ID ${this.locationID}, ` +
          `day ${this.startEpochDay}, collectors ${this.normalizedCollectors}`
      );
    }
    // do update set
    // is_cave=$2, kingdom_names=$6, kingdom_counts=$7,
    // phylum_names=$8, phylum_counts=$9, class_names=$10, class_counts=$11,
    // order_names=$12, order_counts=$13, family_names=$14, family_counts=$15,
    // genus_names=$16, genus_counts=$17, species_names=$18, species_counts=$19,
    // subspecies_names=$20, subspecies_counts=$21`,
  }

  //// PRIVATE INSTANCE METHODS //////////////////////////////////////////////

  private _updateTaxon(
    upperTaxon: string | null,
    lowerTaxon: string | null,
    visitNamesField: keyof LocationVisit,
    visitCountsField: keyof LocationVisit
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
            this[visitCountsField] = `${taxonCounts.substring(
              0,
              taxonIndex
            )}0${taxonCounts.substring(taxonIndex + 1)}`;
          }
        }
      }
    }
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  private static async create(db: DB, data: LocationVisitData): Promise<LocationVisit> {
    const visit = new LocationVisit(data);
    await visit.save(db);
    return visit;
  }

  static async addSpecimen(db: DB, specimen: Specimen): Promise<void> {
    if (specimen.collectionStartDate === null) {
      throw Error("Can't add visits for a specimen with no start date");
    }
    if (specimen.collectionEndDate !== null) {
      throw Error("Can't add visits for a specimen having an end date");
    }
    if (specimen.normalizedCollectors === null) {
      throw Error("Can't add visits for a specimen with no collectors");
    }

    const speciesName = specimen.speciesName
      ? specimen.subspeciesName
        ? specimen.taxonUnique.substring(0, specimen.taxonUnique.lastIndexOf(' '))
        : specimen.taxonUnique
      : null;
    const subspeciesName = specimen.subspeciesName ? specimen.taxonUnique : null;
    const startEpochDay = Math.floor(
      specimen.collectionStartDate.getTime() / MILLIS_PER_DAY
    );

    const visit = await LocationVisit.getByKey(
      db,
      specimen.localityID,
      startEpochDay,
      specimen.normalizedCollectors
    );

    if (visit === null) {
      await this.create(db, {
        locationID: specimen.localityID,
        isCave: specimen.localityName.toLowerCase().includes('cave'),
        startEpochDay,
        endEpochDay: null,
        normalizedCollectors: specimen.normalizedCollectors,
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

      await visit.save(db);
    }
  }

  static async getByKey(
    db: DB,
    locationID: number,
    startEpochDay: number,
    normalizedCollectors: string
  ): Promise<LocationVisit | null> {
    const result = await db.query(
      `select * from visits where location_id=$1 and start_epoch_day=$2
        and normalized_collectors=$3`,
      [locationID, startEpochDay, normalizedCollectors]
    );
    return result.rows.length > 0
      ? new LocationVisit(toCamelRow(result.rows[0]))
      : null;
  }
}

function _toInitialCount(
  upperTaxon: string | null,
  lowerTaxon: string | null
): string | null {
  if (!upperTaxon) return null;
  return upperTaxon && !lowerTaxon ? '1' : '0';
}
