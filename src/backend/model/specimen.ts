/**
 * Class representing a vial of specimens all of the same taxon.
 */

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import { Taxon } from './taxon';
import { Location } from './location';
import { ImportFailure } from './import_failure';
import { Logs, LogType } from './logs';

type SpecimenData = DataOf<Specimen>;

const END_DATE_CONTEXT_REGEX = /[;|./]? *[*]end date:? *([^ ;|./]*) */i;
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
  decimalLatitude?: string;
  decimalLongitude?: string;

  startDate?: string;
  collectors?: string; // |-delimited names, last name last
  determinationDate?: string;
  determiners?: string; // |-delimited names, last name last
  collectionRemarks?: string;
  occurrenceRemarks?: string;
  determinationRemarks?: string;
  typeStatus?: string;
  organismQuantity?: string;
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
  determinationYear: number | null;
  determiners: string | null; // |-delimited names, last name last
  collectionRemarks: string | null;
  occurrenceRemarks: string | null;
  determinationRemarks: string | null;
  typeStatus: string | null;
  specimenCount: number | null;
  problems: string | null;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: SpecimenData) {
    this.catalogNumber = data.catalogNumber;
    this.occurrenceGuid = data.occurrenceGuid; // GBIF occurrenceID (Specify co.GUID)

    this.kingdomID = data.kingdomID;
    this.phylumID = data.phylumID;
    this.classID = data.classID;
    this.orderID = data.orderID;
    this.familyID = data.familyID;
    this.genusID = data.genusID;
    this.speciesID = data.speciesID;
    this.subspeciesID = data.subspeciesID;
    this.preciseTaxonID = data.preciseTaxonID; // ID of most specific taxon

    this.continentID = data.continentID;
    this.countryID = data.countryID;
    this.stateProvinceID = data.stateProvinceID;
    this.countyID = data.countyID;
    this.localityID = data.localityID;
    this.preciseLocationID = data.preciseLocationID; // ID of most specific location

    this.collectionStartDate = data.collectionStartDate;
    this.collectionEndDate = data.collectionEndDate;
    this.collectors = data.collectors; // |-delimited names, last name last
    this.determinationYear = data.determinationYear;
    this.determiners = data.determiners; // |-delimited names, last name last
    this.collectionRemarks = data.collectionRemarks;
    this.occurrenceRemarks = data.occurrenceRemarks;
    this.determinationRemarks = data.determinationRemarks;
    this.typeStatus = data.typeStatus;
    this.specimenCount = data.specimenCount;
    this.problems = data.problems;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  // Must commit specimens before committing taxa and locations because
  // specimens references taxa and locations.
  static async commit(db: DB): Promise<void> {
    await db.query('delete from specimens where committed=true');
    await db.query('update specimens set committed=true');
  }

  static async create(db: DB, source: SpecimenSource): Promise<Specimen | null> {
    const problemList: string[] = [];
    let taxon: Taxon;
    let taxonIDs: string[];
    let location: Location;
    let locationIDs: string[];
    let specimen: Specimen;

    // Perform crucial initial actions that might prevent the import on error.

    try {
      // Require that the specimen have a catalog number.

      if (!source.catalogNumber || source.catalogNumber == '') {
        const guid = source.occurrenceID
          ? 'GBIF occurrenceID ' + source.occurrenceID
          : 'no GBIF occurrence ID given';
        throw new ImportFailure(`Missing catalog number (${guid})`);
      }

      // Return the specimen if it already exists.

      const lookup = await Specimen.getByCatNum(db, source.catalogNumber, false);
      if (lookup) return lookup;

      // Create the associated taxa and locations, if they don't already exist.

      taxon = await Taxon.getOrCreate(db, source);
      if (taxon.parentIDSeries == '') {
        taxonIDs = [];
      } else {
        taxonIDs = taxon.parentIDSeries.split(',');
      }

      location = await Location.getOrCreate(db, source);
      locationIDs = location.parentIDSeries.split(',');
    } catch (err: any) {
      // Fail the import on error.

      if (!(err instanceof ImportFailure)) throw err;
      await logImportProblem(db, source, err.message, true);
      return null;
    }

    // Extract the start and end dates, getting the end date from
    // collectionRemarks, when present.

    let startDate = source.startDate ? new Date(source.startDate) : null;
    let endDate: Date | null = null;
    let collectionRemarks = source.collectionRemarks || null;
    if (collectionRemarks) {
      const match = END_DATE_CONTEXT_REGEX.exec(collectionRemarks);
      if (match) {
        collectionRemarks =
          collectionRemarks.substring(0, match.index) +
          collectionRemarks.substring(match.index + match[0].length);
        if (!END_DATE_REGEX.test(match[1])) {
          problemList.push(
            'Invalid end date syntax in event remarks; assuming no end date'
          );
        } else {
          // Assume end dates are in Texas time (Central)
          endDate = new Date(match[1].replace(/[/]/g, '-') + 'T06:00:00.000Z');
          if (!startDate) {
            problemList.push(
              'End date given but no start date; assuming start date is end date'
            );
            startDate = endDate;
          } else if (startDate.getTime() > endDate.getTime()) {
            problemList.push('Start date follows end date; both dates ignored');
            startDate = endDate = null;
          }
        }
      }
    }

    // Parse the determination year. Depending on where the data was imported
    // from, the month and day may be zeros or random values.

    let determinationYear: number | null = null;
    if (source.determinationDate) {
      const match = source.determinationDate.match(/\d{4}/);
      if (match) {
        determinationYear = parseInt(match[0]);
      }
    }

    // Parse the speciment count.

    let specimenCount: number | null = null;
    if (source.organismQuantity) {
      specimenCount = parseInt(source.organismQuantity);
      if (isNaN(specimenCount)) {
        problemList.push('Invalid specimen count; assuming no specimen count');
        specimenCount = null;
      }
    }

    // Assemble the specimen instance from the data.

    specimen = new Specimen({
      catalogNumber: source.catalogNumber,
      occurrenceGuid: source.occurrenceID,

      kingdomID: getTreeNodeID(taxonIDs, 0, taxon.taxonID)!,
      phylumID: getTreeNodeID(taxonIDs, 1, taxon.taxonID),
      classID: getTreeNodeID(taxonIDs, 2, taxon.taxonID),
      orderID: getTreeNodeID(taxonIDs, 3, taxon.taxonID),
      familyID: getTreeNodeID(taxonIDs, 4, taxon.taxonID),
      genusID: getTreeNodeID(taxonIDs, 5, taxon.taxonID),
      speciesID: getTreeNodeID(taxonIDs, 6, taxon.taxonID),
      subspeciesID: getTreeNodeID(taxonIDs, 7, taxon.taxonID),
      preciseTaxonID: taxon.taxonID,

      continentID: getTreeNodeID(locationIDs, 0, location.locationID)!,
      countryID: getTreeNodeID(locationIDs, 1, location.locationID),
      stateProvinceID: getTreeNodeID(locationIDs, 2, location.locationID),
      countyID: getTreeNodeID(locationIDs, 3, location.locationID),
      localityID: getTreeNodeID(locationIDs, 4, location.locationID),
      preciseLocationID: location.locationID,

      collectionStartDate: startDate,
      collectionEndDate: endDate,
      collectors: source.collectors?.replace(/ ?[|] ?/g, '|') || null,
      determinationYear,
      determiners: source.determiners?.replace(/ ?[|] ?/g, '|') || null,
      collectionRemarks: collectionRemarks,
      occurrenceRemarks: source.occurrenceRemarks || null,
      determinationRemarks: source.determinationRemarks || null,
      typeStatus: source.typeStatus || null,
      specimenCount: specimenCount || null /* 0 and NaN => null */,
      problems: problemList.length > 0 ? problemList.join('|') : null
    });

    // Add the specimen to the database. Specimens are read-only.

    await db.query(
      `insert into specimens(
          catalog_number, occurrence_guid,
          kingdom_id, phylum_id, class_id, order_id, family_id,
          genus_id, species_id, subspecies_id, precise_taxon_id,
          continent_id, country_id, state_province_id,
          county_id, locality_id, precise_location_id,
          collection_start_date, collection_end_date,
          collectors, determination_year, determiners,
          collection_remarks, occurrence_remarks, determination_remarks,
          type_status, specimen_count, problems
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)`,
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
        specimen.collectionStartDate?.toISOString() || null,
        specimen.collectionEndDate?.toISOString() || null,
        specimen.collectors,
        specimen.determinationYear,
        specimen.determiners,
        specimen.collectionRemarks,
        specimen.occurrenceRemarks,
        specimen.determinationRemarks,
        specimen.typeStatus,
        specimen.specimenCount,
        specimen.problems
      ]
    );

    // Record import problems in the log and return the specimen.

    for (const problem of problemList) {
      await logImportProblem(db, source, problem, false);
    }
    return specimen;
  }

  static async getByCatNum(
    db: DB,
    catalogNumber: string,
    committed: boolean
  ): Promise<Specimen | null> {
    const result = await db.query(
      `select * from specimens where catalog_number=$1 and committed=$2`,
      [
        catalogNumber,
        // @ts-ignore
        committed
      ]
    );
    return result.rows.length > 0 ? new Specimen(toCamelRow(result.rows[0])) : null;
  }
}

function getTreeNodeID(
  ancestorIDs: string[],
  index: number,
  leafID: number
): number | null {
  if (index == ancestorIDs.length) {
    return leafID;
  }
  if (index > ancestorIDs.length) {
    return null;
  }
  const ancestorID = ancestorIDs[index];
  if (ancestorID == '-') {
    return null;
  }
  return parseInt(ancestorID);
}

async function logImportProblem(
  db: DB,
  source: SpecimenSource,
  line: string,
  failed: boolean
) {
  if (line.charAt(line.length - 1) != '.') {
    line += '.';
  }
  if (failed) {
    line += ' NOT IMPORTED';
  }
  const catalogNumber = source.catalogNumber
    ? source.catalogNumber
    : 'NO CATALOG NUMBER';
  await Logs.post(db, LogType.Import, catalogNumber, line);
}
