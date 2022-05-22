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
  normaliziedCollectors: string;
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
    this.normaliziedCollectors = data.normaliziedCollectors;
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

  async save(db: DB): Promise<number> {
    if (this.locationID === 0) {
      const result = await db.query(
        `insert into visits(
            location_id, is_cave, start_date, end_date, normalized_collectors,
            phylum_names, phylum_counts, class_names, class_counts,
            order_names, order_counts, family_names, family_counts,
            genus_names, genus_counts, species_names, species_counts,
            subspecies_names, subspecies_counts
					) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19)`,
        [
          this.locationID,
          // @ts-ignore
          this.isCave,
          this.startEpochDay,
          this.endEpochDay,
          this.normaliziedCollectors,
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
      this.locationID = result.rows[0].location_id;
    } else {
      const result = await db.query(
        `update locations set 
            is_cave=$1, end_date=$2, phylum_names=$3, phylum_counts=$4,
            class_names=$5, class_counts=$6, order_names=$7, order_counts=$8, family_names=$9, family_counts=$10, genus_names=$11, genus_counts=$12,
            species_names=$13, species_counts=$14,
            subspecies_names=$15, subspecies_counts=$16
          where location_id=$17 and start_date=$18 and normalized_collectors=$19`,
        [
          // @ts-ignore
          this.isCave,
          this.endEpochDay,
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
          this.locationID,
          this.startEpochDay,
          this.normaliziedCollectors
        ]
      );
      if (result.rowCount != 1) {
        throw Error(
          `Failed to update visit location ID ${this.locationID}, ` +
            `day ${this.startEpochDay}, collectors ${this.normaliziedCollectors}`
        );
      }
    }
    return this.locationID;
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
        normaliziedCollectors: specimen.normalizedCollectors,
        phylumNames: specimen.phylumName,
        phylumCounts: specimen.phylumName && !specimen.className ? '1' : '0',
        classNames: specimen.className,
        classCounts: specimen.className && !specimen.orderName ? '1' : '0',
        orderNames: specimen.orderName,
        orderCounts: specimen.orderName && !specimen.familyName ? '1' : '0',
        familyNames: specimen.familyName,
        familyCounts: specimen.familyName && !specimen.genusName ? '1' : '0',
        genusNames: specimen.genusName,
        genusCounts: specimen.genusName && !speciesName ? '1' : '0',
        speciesNames: speciesName,
        speciesCounts: speciesName && !subspeciesName ? '1' : '0',
        subspeciesNames: subspeciesName,
        subspeciesCounts: subspeciesName ? '1' : '0'
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
      `select * from locations where location_id=$1 and start_epoch_day=$2
        and normalized_collectors=$3`,
      [locationID, startEpochDay, normalizedCollectors]
    );
    return result.rows.length > 0
      ? new LocationVisit(toCamelRow(result.rows[0]))
      : null;
  }
}
