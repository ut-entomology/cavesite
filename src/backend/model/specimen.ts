/**
 * Class representing a vial of specimens all of the same taxon.
 */
import pgFormat from 'pg-format';

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import { Taxon } from './taxon';
import { Location } from './location';
import { ImportFailure } from './import_failure';
import { Logs, LogType } from './logs';
import { TaxonFilter, SortColumn, ColumnSort, locationRanks } from '../../shared/model';
import { BadDataError } from '../util/error_util';

export type SpecimenData = DataOf<Specimen>;

const END_DATE_CONTEXT_REGEX = /[;|./]? *[*]end date:? *([^ ;|./]*) */i;
const END_DATE_REGEX = /\d{4}(?:[-/]\d{1,2}){2}(?:$|[^\d])/;
const INTEGER_LIST_CHARS_REGEX = /^[\d,]+$/;
const LAST_NAMES_REGEX = /([^ |,]+(?:, ?(jr.|ii|iii|2nd|3rd))?)(?:\||$)/g;

const sortColumnMap: Record<number, string> = {};
sortColumnMap[SortColumn.CatalogNumber] = 'catalog_number';
sortColumnMap[SortColumn.Phylum] = 'phylum_name';
sortColumnMap[SortColumn.Class] = 'class_name';
sortColumnMap[SortColumn.Order] = 'order_name';
sortColumnMap[SortColumn.Family] = 'family_name';
sortColumnMap[SortColumn.Genus] = 'genus_name';
sortColumnMap[SortColumn.Species] = 'species_name';
sortColumnMap[SortColumn.Subspecies] = 'taxon_name';
sortColumnMap[SortColumn.County] = 'county_name';
sortColumnMap[SortColumn.Locality] = 'locality_name';
sortColumnMap[SortColumn.StartDate] = 'collection_start_date';
sortColumnMap[SortColumn.EndDate] = 'collection_end_date';
sortColumnMap[SortColumn.TypeStatus] = 'type_status';
sortColumnMap[SortColumn.SpecimenCount] = 'specimen_count';

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
  taxonID: number; // ID of most specific taxon
  localityID: number;
  collectionStartDate: Date | null;
  collectionEndDate: Date | null;
  collectors: string | null; // |-delimited names, last name last
  // |-delimited lowercase last names, alphabetically sorted
  normalizedCollectors: string | null;
  determinationYear: number | null;
  determiners: string | null; // |-delimited names, last name last
  collectionRemarks: string | null;
  occurrenceRemarks: string | null;
  determinationRemarks: string | null;
  typeStatus: string | null;
  specimenCount: number | null;
  problems: string | null;

  // values cached from the taxa table

  phylumName: string | null;
  phylumID: number | null;
  className: string | null;
  classID: number | null;
  orderName: string | null;
  orderID: number | null;
  familyName: string | null;
  familyID: number | null;
  genusName: string | null;
  genusID: number | null;
  speciesName: string | null;
  speciesID: number | null;
  subspeciesName: string | null;
  subspeciesID: number | null;
  taxonUnique: string;
  taxonAuthor: string | null;

  // values cached from the locations table

  countyName: string | null;
  countyID: number | null;
  localityName: string;
  publicLatitude: number | null;
  publicLongitude: number | null;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: SpecimenData) {
    this.catalogNumber = data.catalogNumber;
    this.occurrenceGuid = data.occurrenceGuid; // GBIF occurrenceID (Specify co.GUID)
    this.taxonID = data.taxonID; // ID of most specific taxon
    this.localityID = data.localityID;
    this.collectionStartDate = data.collectionStartDate;
    this.collectionEndDate = data.collectionEndDate;
    this.collectors = data.collectors; // |-delimited names, last name last
    this.normalizedCollectors = data.normalizedCollectors;
    this.determinationYear = data.determinationYear;
    this.determiners = data.determiners; // |-delimited names, last name last
    this.collectionRemarks = data.collectionRemarks;
    this.occurrenceRemarks = data.occurrenceRemarks;
    this.determinationRemarks = data.determinationRemarks;
    this.typeStatus = data.typeStatus;
    this.specimenCount = data.specimenCount;
    this.problems = data.problems;
    this.phylumName = data.phylumName;
    this.phylumID = data.phylumID;
    this.className = data.className;
    this.classID = data.classID;
    this.orderName = data.orderName;
    this.orderID = data.orderID;
    this.familyName = data.familyName;
    this.familyID = data.familyID;
    this.genusName = data.genusName;
    this.genusID = data.genusID;
    this.speciesName = data.speciesName;
    this.speciesID = data.speciesID;
    this.subspeciesName = data.subspeciesName;
    this.subspeciesID = data.subspeciesID;
    this.taxonUnique = data.taxonUnique;
    this.taxonAuthor = data.taxonAuthor;
    this.countyName = data.countyName;
    this.countyID = data.countyID;
    this.localityName = data.localityName;
    this.publicLatitude = data.publicLatitude;
    this.publicLongitude = data.publicLongitude;
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
    let taxonNames: string[] = [];
    let taxonIDs: string[] = [];
    let location: Location;
    let locationNames: (string | null)[];
    let locationIDs: (string | null)[];
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
      if (taxon.parentIDPath != '') {
        taxonIDs = taxon.parentIDPath.split(',');
        taxonNames = taxon.parentNamePath.split('|');
      }

      location = await Location.getOrCreate(db, source);
      locationIDs = location.parentIDPath.split(',');
      locationNames = location.parentNamePath.split('|');
      // Location always has locality but may be missing intermediates.
      while (locationIDs.length < locationRanks.length - 1) {
        locationIDs.push(null);
        locationNames.push(null);
      }
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

    // Normalize the list of collectors.

    const collectors = source.collectors?.replace(/ ?[|] ?/g, '|') || null;
    let normalizedCollectors = null;
    if (collectors !== null) {
      const matches = collectors.toLowerCase().matchAll(LAST_NAMES_REGEX);
      normalizedCollectors = Array.from(matches)
        .map((match) => match[1])
        .sort()
        .join('|');
    }

    // Assemble the specimen instance from the data.

    specimen = new Specimen({
      catalogNumber: source.catalogNumber,
      occurrenceGuid: source.occurrenceID,
      taxonID: taxon.taxonID,
      localityID: location.locationID,
      collectionStartDate: startDate,
      collectionEndDate: endDate,
      collectors,
      normalizedCollectors,
      determinationYear,
      determiners: source.determiners?.replace(/ ?[|] ?/g, '|') || null,
      collectionRemarks: collectionRemarks,
      occurrenceRemarks: source.occurrenceRemarks || null,
      determinationRemarks: source.determinationRemarks || null,
      typeStatus: source.typeStatus || null,
      specimenCount: specimenCount || null /* 0 and NaN => null */,
      problems: problemList.length > 0 ? problemList.join('|') : null,
      phylumName: getRankedName(taxonNames, 1, taxon.taxonName),
      phylumID: getRankedID(taxonIDs, 1, taxon.taxonID),
      className: getRankedName(taxonNames, 2, taxon.taxonName),
      classID: getRankedID(taxonIDs, 2, taxon.taxonID),
      orderName: getRankedName(taxonNames, 3, taxon.taxonName),
      orderID: getRankedID(taxonIDs, 3, taxon.taxonID),
      familyName: getRankedName(taxonNames, 4, taxon.taxonName),
      familyID: getRankedID(taxonIDs, 4, taxon.taxonID),
      genusName: getRankedName(taxonNames, 5, taxon.taxonName),
      genusID: getRankedID(taxonIDs, 5, taxon.taxonID),
      speciesName: getRankedName(taxonNames, 6, taxon.taxonName),
      speciesID: getRankedID(taxonIDs, 6, taxon.taxonID),
      subspeciesName: getRankedName(taxonNames, 7, taxon.taxonName),
      subspeciesID: getRankedID(taxonIDs, 7, taxon.taxonID),
      taxonUnique: taxon.uniqueName,
      taxonAuthor: taxon.author,
      countyName: getRankedName(locationNames, 3, location.locationName),
      countyID: getRankedID(locationIDs, 3, location.locationID),
      localityName: location.locationName,
      publicLatitude: location.publicLatitude,
      publicLongitude: location.publicLongitude
    });

    // Add the specimen to the database. Specimens are read-only.

    await db.query(
      `insert into specimens(
          catalog_number, occurrence_guid, taxon_id, locality_id,
          collection_start_date, collection_end_date,
          collectors, normalized_collectors, determination_year, determiners,
          collection_remarks, occurrence_remarks, determination_remarks,
          type_status, specimen_count, problems,
          phylum_name, phylum_id, class_name, class_id, order_Name, order_id,
          family_name, family_id, genus_name, genus_id, species_name, species_id,
          subspecies_name, subspecies_id, taxon_unique, taxon_author,
          county_name, county_id, locality_name, public_latitude, public_longitude
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37)`,
      [
        specimen.catalogNumber,
        specimen.occurrenceGuid,
        specimen.taxonID,
        specimen.localityID,
        specimen.collectionStartDate?.toISOString() || null,
        specimen.collectionEndDate?.toISOString() || null,
        specimen.collectors,
        specimen.normalizedCollectors,
        specimen.determinationYear,
        specimen.determiners,
        specimen.collectionRemarks,
        specimen.occurrenceRemarks,
        specimen.determinationRemarks,
        specimen.typeStatus,
        specimen.specimenCount,
        specimen.problems,
        specimen.phylumName,
        specimen.phylumID,
        specimen.className,
        specimen.classID,
        specimen.orderName,
        specimen.orderID,
        specimen.familyName,
        specimen.familyID,
        specimen.genusName,
        specimen.genusID,
        specimen.speciesName,
        specimen.speciesID,
        specimen.subspeciesName,
        specimen.subspeciesID,
        specimen.taxonUnique,
        specimen.taxonAuthor,
        specimen.countyName,
        specimen.countyID,
        specimen.localityName,
        specimen.publicLatitude,
        specimen.publicLongitude
      ]
    );

    // Record import problems in the log and return the specimen.

    for (const problem of problemList) {
      await logImportProblem(db, source, problem, false);
    }
    return specimen;
  }

  static async getSamplingBatch(
    db: DB,
    skip: number,
    limit: number
  ): Promise<SpecimenData[]> {
    const result = await db.query(`select * from specimens limit $1 offset $2`, [
      limit,
      skip
    ]);
    return result.rows.map((row) => new Specimen(toCamelRow(row)));
  }

  static async generalQuery(
    db: DB,
    skip: number,
    limit: number,
    taxonFilter: TaxonFilter | null,
    columnSorts: ColumnSort[]
  ): Promise<Specimen[]> {
    let query = `select s.catalog_number, s.occurrence_guid, t.taxon_rank,
        t.unique_name as taxon_unique, t.author as taxon_author, t.phylum_name,
        t.class_name, t.order_name, t.family_name, t.genus_name, t.species_name,
        t.county_name, l.locality_name, s.collection_start_date,
        s.collection_end_date, s.collectors, s.determination_year, s.determiners,
        s.collection_remarks, s.occurrence_remarks, s.determination_remarks,
        s.type_status, s.specimen_count, s.problems
      from specimens s join taxa t on t.taxon_id = s.taxon_id %s
        join locations l on l.location_id = s.locality_id %s
        limit $1 offset $2`;

    let taxaConstraints = '';
    if (taxonFilter !== null) {
      let taxaConditions: string[] = [];
      const taxonIDs: number[] = [];
      _collectOrInIntList(taxaConditions, 'phylum_id', taxonFilter.phylumIDs, taxonIDs);
      _collectOrInIntList(taxaConditions, 'class_id', taxonFilter.classIDs, taxonIDs);
      _collectOrInIntList(taxaConditions, 'order_id', taxonFilter.orderIDs, taxonIDs);
      _collectOrInIntList(taxaConditions, 'family_id', taxonFilter.familyIDs, taxonIDs);
      _collectOrInIntList(taxaConditions, 'genus_id', taxonFilter.genusIDs, taxonIDs);
      _collectOrInIntList(
        taxaConditions,
        'species_id',
        taxonFilter.speciesIDs,
        taxonIDs
      );
      taxaConstraints = `taxon_unique in (${taxonIDs.join(',')})`;
      if (taxaConditions.length > 0) {
        taxaConstraints = `${taxaConstraints} or ${taxaConditions.join(' or ')}`;
      }
      taxaConstraints = `and (${taxaConstraints})`;
    }

    const orderBys =
      'order by ' +
      columnSorts
        .map((sort) => sortColumnMap[sort.column] + (sort.ascending ? '' : ' desc'))
        .join(',');

    query = pgFormat(query, taxaConstraints, orderBys);
    const result = await db.query(query, [limit, skip]);
    return result.rows.map((row) => toCamelRow(row));
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

function getRankedID(
  containingIDs: (string | null)[],
  index: number,
  leafID: number
): number | null {
  if (index > containingIDs.length) {
    return null;
  }
  if (index == containingIDs.length) {
    return leafID;
  }
  const containingIDStr = containingIDs[index];
  return containingIDStr ? parseInt(containingIDStr) : null;
}

function getRankedName(
  containingNames: (string | null)[],
  index: number,
  leafName: string
): string | null {
  if (index > containingNames.length) {
    return null;
  }
  if (index == containingNames.length) {
    return leafName;
  }
  return containingNames[index];
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

function _collectOrInIntList(
  conditionals: string[],
  columnName: string,
  inList: number[] | null,
  taxonIDs: number[]
): void {
  if (inList) {
    taxonIDs.push(...taxonIDs);
    const inListStr = inList.join(',');
    if (!INTEGER_LIST_CHARS_REGEX.test(inListStr)) {
      throw new BadDataError('Invalid characters');
    }
    conditionals.push(`${columnName} in [${inListStr}]`);
  }
}
