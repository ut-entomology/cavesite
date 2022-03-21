/**
 * Class representing a vial of specimens all of the same taxon.
 */

import type { DataOf } from '../util/type_util';
import { DB, toCamelRow } from '../util/pg_util';
import { Taxon } from './taxon';
import { Location } from './location';
import { DataError } from './data_error';

export type SpecimenData = DataOf<Specimen>;

const END_DATE_CONTEXT_REGEX = / *[*]end date:? *([^ ;|./]*) *[;|./]?/i;
const END_DATE_REGEX = /\d{4}(?:[-/]\d{1,2}){2}(?:$|[^\d])/;

export interface SpecimenSource {
  // GBIF field names

  catalogNumber: string;
  occurrenceID: string;

  kingdom: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  specificEpithet?: string;
  infraspecificEpithet?: string;
  scientificName: string;

  continent: string;
  country?: string;
  stateProvince?: string;
  county?: string;
  locality?: string;
  decimalLatitude?: number;
  decimalLongitude?: number;

  startDate?: Date;
  collectors?: string; // |-delimited names, last name last
  determinationDate?: Date;
  determiners?: string; // |-delimited names, last name last
  collectionRemarks?: string;
  occurrenceRemarks?: string;
  determinationRemarks?: string;
  typeStatus?: string;
  organismQuantity?: number;
}

export class Specimen {
  catalogNumber: string;
  occurrenceGuid: string; // GBIF occurrenceID (specify co.GUID)
  kingdomID: number;
  phylumID: number | null;
  classID: number | null;
  orderID: number | null;
  familyID: number | null;
  genusID: number | null;
  speciesID: number | null;
  subspeciesID: number | null;
  preciseTaxonID: number; // ID of most specific taxon

  continentID: number;
  countryID: number | null;
  stateProvinceID: number | null;
  countyID: number | null;
  localityID: number | null;
  preciseLocationID: number; // ID of most specific location

  collectionStartDate: Date | null;
  collectionEndDate: Date | null;
  collectors: string | null; // |-delimited names, last name last
  determinationDate: Date | null;
  determiners: string | null; // |-delimited names, last name last
  collectionRemarks: string | null;
  occurrenceRemarks: string | null;
  determinationRemarks: string | null;
  typeStatus: string | null;
  specimenCount: number | null;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  constructor(row: SpecimenData) {
    this.catalogNumber = row.catalogNumber;
    this.occurrenceGuid = row.occurrenceGuid; // GBIF occurrenceID (Specify co.GUID)

    this.kingdomID = row.kingdomID;
    this.phylumID = row.phylumID;
    this.classID = row.classID;
    this.orderID = row.orderID;
    this.familyID = row.familyID;
    this.genusID = row.genusID;
    this.speciesID = row.speciesID;
    this.subspeciesID = row.subspeciesID;
    this.preciseTaxonID = row.preciseTaxonID; // ID of most specific taxon

    this.continentID = row.continentID;
    this.countryID = row.countryID;
    this.stateProvinceID = row.stateProvinceID;
    this.countyID = row.countyID;
    this.localityID = row.localityID;
    this.preciseLocationID = row.preciseLocationID; // ID of most specific location

    this.collectionStartDate = row.collectionStartDate;
    this.collectionEndDate = row.collectionEndDate;
    this.collectors = row.collectors; // |-delimited names, last name last
    this.determinationDate = row.determinationDate;
    this.determiners = row.determiners; // |-delimited names, last name last
    this.collectionRemarks = row.collectionRemarks;
    this.occurrenceRemarks = row.occurrenceRemarks;
    this.determinationRemarks = row.determinationRemarks;
    this.typeStatus = row.typeStatus;
    this.specimenCount = row.specimenCount;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  // TODO: combine into create()
  static async create(db: DB, source: SpecimenSource): Promise<Specimen> {
    // Return the specimen if it already exists.

    let specimen = await Specimen.getByCatNum(db, source.catalogNumber);
    if (specimen) return specimen;

    // Create the associated taxa and locations, if they don't already exist.

    const taxon = await Taxon.getOrCreate(db, source);
    const taxonIDs = taxon.parentIDSeries.split(',');

    const location = await Location.getOrCreate(db, source);
    const locationIDs = location.parentIDSeries.split(',');

    // Extract the end date from collectionRemarks, when present.

    let endDate: Date | null = null;
    let collectionRemarks = source.collectionRemarks || null;
    if (collectionRemarks) {
      const match = END_DATE_CONTEXT_REGEX.exec(collectionRemarks);
      if (match) {
        collectionRemarks =
          collectionRemarks.substring(0, match.index) +
          collectionRemarks.substring(match.index + match[0].length);
        if (!END_DATE_REGEX.test(match[1])) {
          throw new DataError('Invalid end date syntax in event remarks');
        }
        // Assume dates are in Texas (Central) time.
        endDate = new Date(match[1].replace(/[/]/g, '-') + 'T06:00:00.000Z');
      }
    }

    // Assemble the specimen instance from the data.

    specimen = new Specimen({
      catalogNumber: source.catalogNumber,
      occurrenceGuid: source.occurrenceID,

      kingdomID: getAncestorID(taxonIDs, 0)!,
      phylumID: getAncestorID(taxonIDs, 1),
      classID: getAncestorID(taxonIDs, 2),
      orderID: getAncestorID(taxonIDs, 3),
      familyID: getAncestorID(taxonIDs, 4),
      genusID: getAncestorID(taxonIDs, 5),
      speciesID: getAncestorID(taxonIDs, 6),
      subspeciesID: getAncestorID(taxonIDs, 7),
      preciseTaxonID: taxon.taxonID,

      continentID: getAncestorID(locationIDs, 0)!,
      countryID: getAncestorID(locationIDs, 1),
      stateProvinceID: getAncestorID(locationIDs, 2),
      countyID: getAncestorID(locationIDs, 3),
      localityID: getAncestorID(locationIDs, 4),
      preciseLocationID: location.locationID,

      collectionStartDate: source.startDate || null,
      collectionEndDate: endDate,
      collectors: source.collectors?.replace(/ [|] /g, '|') || null,
      determinationDate: source.determinationDate || null,
      determiners: source.determiners?.replace(/ [|] /g, '|') || null,
      collectionRemarks: collectionRemarks,
      occurrenceRemarks: source.occurrenceRemarks || null,
      determinationRemarks: source.determinationRemarks || null,
      typeStatus: source.typeStatus || null,
      specimenCount: source.organismQuantity || null
    });

    // Add the specimen to the database. Specimens are read-only.

    await db.query(
      `insert into specimens(
          catalog_number, occurrence_guid,
          kingdom_id, phylum_id, class_id, order_id, family_id,
          genus_id, species_id, subspecies_id, precise_taxon_id,
          continent_id, country_id, state_province_id,
          county_id, locality_id, precise_location_id,
          date(collection_start_date), date(collection_end_date),
          collectors, date(determination_date), determiners,
          collection_remarks, occurrence_remarks,  determination_remarks,
          type_status, specimen_count,
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
				returning location_id`,
      [
        specimen.catalogNumber,
        specimen.occurrenceGuid,
        specimen.kingdomID,
        specimen.phylumID,
        specimen.classID,
        specimen.orderID,
        specimen.familyID,
        specimen.genusID,
        specimen.speciesID,
        specimen.subspeciesID,
        specimen.preciseTaxonID,
        specimen.continentID,
        specimen.countryID,
        specimen.stateProvinceID,
        specimen.countyID,
        specimen.localityID,
        specimen.preciseLocationID,
        // @ts-ignore
        specimen.collectionStartDate,
        // @ts-ignore
        specimen.collectionEndDate,
        specimen.collectors,
        // @ts-ignore
        specimen.determinationDate,
        specimen.determiners,
        specimen.collectionRemarks,
        specimen.occurrenceRemarks,
        specimen.determinationRemarks,
        specimen.typeStatus,
        specimen.specimenCount
      ]
    );
    return specimen;
  }

  static async getByCatNum(db: DB, catalogNumber: string): Promise<Specimen | null> {
    const result = await db.query(`select * from specimens where catalog_number=$1`, [
      catalogNumber
    ]);
    return result.rows.length > 0 ? new Specimen(toCamelRow(result.rows[0])) : null;
  }
}

function getAncestorID(ancestorIDs: string[], ancestorIndex: number): number | null {
  if (ancestorIndex > ancestorIDs.length) {
    return null;
  }
  const ancestorID = ancestorIDs[ancestorIndex];
  if (ancestorID == '-') {
    return null;
  }
  return parseInt(ancestorID);
}
