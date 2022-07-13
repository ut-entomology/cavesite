/**
 * Class representing a vial of specimens all of the same taxon.
 */

// TODO: Revisit use of GUIDs and location uniques for specimens and private coords.

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow, toPostgresDate } from '../integrations/postgres';
import { Taxon, type TaxonSource } from './taxon';
import { Location } from './location';
import { ImportFailure } from './import_failure';
import { Logs, LogType } from './logs';
import { type TaxonPathSpec, locationRanks } from '../../shared/model';
import {
  QueryColumnID,
  type QueryColumnSpec,
  type QueryDateFilter,
  type QueryLocationFilter,
  type QueryTaxonFilter,
  type QueryRow,
  columnInfoMap
} from '../../shared/general_query';

export type SpecimenData = DataOf<Specimen>;

const END_DATE_CONTEXT_REGEX = /[;|./]? *[*]end date:? *([^ ;|./]*) */i;
const END_DATE_REGEX = /\d{4}(?:[-/]\d{1,2}){2}(?:$|[^\d])/;
const LAST_NAMES_REGEX = /([^ |,]+(?:, ?(jr.|ii|iii|2nd|3rd))?)(?:\||$)/g;
const CAVEDATA_REGEX = /CAVEDATA\[([^\]]*)\]/;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_PITFALL_TRAP_COLLECTION_DAYS = 4 * 31;

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
  lifeStage?: string;
}

export class Specimen implements TaxonPathSpec {
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
  lifeStage: string | null;
  problems: string | null;

  // values cached from the taxa table

  kingdomName: string;
  kingdomID: number;
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
  obligate: string | null; // 'cave', or blank if status not indicated

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
    this.lifeStage = data.lifeStage;
    this.problems = data.problems;
    this.kingdomName = data.kingdomName;
    this.kingdomID = data.kingdomID;
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
    this.obligate = data.obligate;
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
    let detRemarks = source.determinationRemarks;
    let determiners = source.determiners?.replace(/ ?[|] ?/g, '|') || null;

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

      // Parse the subgenus from the determination remarks.

      let taxonSource: TaxonSource = source;
      if (detRemarks) {
        const match = detRemarks.match(CAVEDATA_REGEX);
        if (match) {
          detRemarks = (
            detRemarks.substring(0, match.index) +
            ' ' +
            detRemarks.substring(match.index! + match[0].length)
          )
            .replace('; ;', '; ')
            .replace('  ', ' ')
            .trim() /* needed here */;
          if ([';', ','].includes(detRemarks[0])) {
            detRemarks = detRemarks.substring(1);
          }
          if ([';', ','].includes(detRemarks[detRemarks.length - 1])) {
            detRemarks = detRemarks.substring(0, detRemarks.length - 1);
          }
          detRemarks = detRemarks.trim();

          const caveDataItems = match[1].split(';');
          for (let item of caveDataItems) {
            item = item.trim();
            if (item.startsWith('subgenus')) {
              taxonSource.subgenus = item.substring('subgenus '.length).trim();
            } else if (item.includes('n.')) {
              if (item.includes('subsp')) {
                taxonSource.infraspecificEpithet = item;
              } else {
                taxonSource.specificEpithet = item;
              }
            }
          }
        }
        const detAlsoBy = 'det. also by';
        if (determiners && detRemarks.includes(detAlsoBy)) {
          const remarks = detRemarks.split(';');
          for (let i = 0; i < remarks.length; ++i) {
            const remark = remarks[i].trimStart();
            if (remark.startsWith(detAlsoBy)) {
              determiners += '|' + remark.substring(detAlsoBy.length).trim();
              remarks.splice(i--, 1);
            }
          }
          detRemarks = remarks.join(';').trim();
        }
      }

      // Create the associated taxa and locations, if they don't already exist.

      taxon = await Taxon.getOrCreate(db, taxonSource);
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
        if (collectionRemarks == '') collectionRemarks = null;
        if (!END_DATE_REGEX.test(match[1])) {
          problemList.push(
            'Invalid end date syntax in event remarks; assumed no end date'
          );
        } else {
          // Assume end dates are in Texas time (Central)
          endDate = new Date(match[1].replace(/[/]/g, '-') + 'T06:00:00.000Z');
          if (!startDate) {
            problemList.push(
              'End date given but no start date; assumed start date is end date'
            );
            startDate = endDate;
            endDate = null;
          } else if (startDate.getTime() > endDate.getTime()) {
            problemList.push(
              `Start date follows end date ${startDate.toDateString()}; end date ignored`
            );
            endDate = null;
          } else if (
            _toEpochDay(endDate) - _toEpochDay(startDate) >
            MAX_PITFALL_TRAP_COLLECTION_DAYS
          ) {
            problemList.push(
              `End date ${endDate.toDateString()} follows start date ` +
                `${startDate.toDateString()} by more than ` +
                `${MAX_PITFALL_TRAP_COLLECTION_DAYS} days; dropped end date`
            );
            endDate = startDate;
            endDate = null;
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

    // Parse the specimen count.

    let specimenCount: number | null = null;
    if (source.organismQuantity) {
      specimenCount = parseInt(source.organismQuantity);
      if (isNaN(specimenCount)) {
        problemList.push('Invalid specimen count; assuming no specimen count');
        specimenCount = null;
      }
    }

    // Parse the life stage.

    let lifeStage: string | null = null;
    if (source.lifeStage) {
      lifeStage = source.lifeStage.toLowerCase();
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
      determiners,
      collectionRemarks: collectionRemarks,
      occurrenceRemarks: source.occurrenceRemarks || null,
      determinationRemarks: detRemarks || null,
      typeStatus: source.typeStatus || null,
      specimenCount: specimenCount || null /* 0 and NaN => null */,
      lifeStage: lifeStage || null,
      problems: problemList.length > 0 ? problemList.join('|') : null,
      kingdomName: getRankedName(taxonNames, 0, taxon.taxonName)!,
      kingdomID: getRankedID(taxonIDs, 0, taxon.taxonID)!,
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
      obligate: taxon.obligate,
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
          type_status, specimen_count, life_stage, problems, kingdom_name, kingdom_id,
          phylum_name, phylum_id, class_name, class_id, order_Name, order_id,
          family_name, family_id, genus_name, genus_id, species_name, species_id,
          subspecies_name, subspecies_id, taxon_unique, taxon_author, obligate,
          county_name, county_id, locality_name, public_latitude, public_longitude
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41)`,
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
        specimen.lifeStage,
        specimen.problems,
        specimen.kingdomName,
        specimen.kingdomID,
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
        specimen.obligate,
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

  // for use in testing
  static async dropAll(db: DB) {
    await db.query('delete from specimens');
  }

  static async getNextBatch(
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
    columnSpecs: QueryColumnSpec[],
    dateFilter: QueryDateFilter | null,
    locationFilter: QueryLocationFilter | null,
    taxonFilter: QueryTaxonFilter | null,
    skip: number,
    limit: number
  ): Promise<[QueryRow[], number | null]> {
    let groupCountTerm: string | null = null;
    let selectDistinctResults = true;
    const selectedColumns: string[] = [];
    const whereComponents: string[] = ['committed = true'];
    const columnOrders: string[] = [];

    if (dateFilter !== null) {
      if (dateFilter.fromDateMillis !== null) {
        const fromDate = toPostgresDate(new Date(dateFilter.fromDateMillis));
        whereComponents.push(
          `(collection_start_date >= ${fromDate} or
            (collection_end_date is not null and
              collection_end_date >= ${fromDate}))`
        );
      }
      if (dateFilter.throughDateMillis !== null) {
        const throughDate = toPostgresDate(new Date(dateFilter.throughDateMillis));
        whereComponents.push(`collection_start_date <= ${throughDate}`);
      }
    }

    for (const columnSpec of columnSpecs) {
      const columnID = columnSpec.columnID;
      if (columnID == QueryColumnID.CatalogNumber) {
        selectDistinctResults = false;
      }
      const columnInfo = columnInfoMap[columnSpec.columnID];
      if (columnInfo.asName !== undefined) {
        const columnTerm = `${columnInfo.column1} as ${columnInfo.asName}`;
        if (columnID == QueryColumnID.ResultCount) {
          groupCountTerm = columnTerm;
        } else {
          selectedColumns.push(columnTerm);
        }
      } else {
        selectedColumns.push(columnInfo.column1);
      }
      if (columnInfo.column2 !== undefined) {
        selectedColumns.push(columnInfo.column2);
      }
      if (columnSpec.optionText && columnInfo.options) {
        const option = columnInfo.options.find(
          (opt) => opt.text == columnSpec.optionText
        );
        if (option && option.sql) {
          whereComponents.push(option.sql.replace('X', columnInfo.column1));
        }
      }
      if (columnID != QueryColumnID.ResultCount) {
        if (columnSpec.ascending !== null) {
          if (columnSpec.ascending) {
            columnOrders.push(columnInfo.column1);
          } else {
            columnOrders.push(columnInfo.column1 + ' desc');
          }
        }
      }
    }

    if (selectedColumns.length == 0) return [[], 0];

    if (locationFilter !== null) {
      let locationConditions: string[] = [];
      _collectInIntegerList(locationConditions, 'county_id', locationFilter.countyIDs);
      _collectInIntegerList(
        locationConditions,
        'locality_id',
        locationFilter.localityIDs
      );
      if (locationConditions.length > 0) {
        whereComponents.push(`(${locationConditions.join(' or ')})`);
      }
    }

    if (taxonFilter !== null) {
      let taxaConditions: string[] = [];
      _collectInIntegerList(taxaConditions, 'phylum_id', taxonFilter.phylumIDs);
      _collectInIntegerList(taxaConditions, 'class_id', taxonFilter.classIDs);
      _collectInIntegerList(taxaConditions, 'order_id', taxonFilter.orderIDs);
      _collectInIntegerList(taxaConditions, 'family_id', taxonFilter.familyIDs);
      _collectInIntegerList(taxaConditions, 'genus_id', taxonFilter.genusIDs);
      _collectInIntegerList(taxaConditions, 'species_id', taxonFilter.speciesIDs);
      _collectInIntegerList(taxaConditions, 'subspecies_id', taxonFilter.subspeciesIDs);
      if (taxaConditions.length > 0) {
        whereComponents.push(`(${taxaConditions.join(' or ')})`);
      }
    }

    const whereClause =
      whereComponents.length == 0 ? '' : 'where ' + whereComponents.join(' and ');

    let selectionClause = selectedColumns.join(', ');
    let countedClause = selectionClause;
    let groupByClause = '';
    if (groupCountTerm) {
      selectDistinctResults = false;
      groupByClause = 'group by ' + selectionClause;
      selectionClause += ', ' + groupCountTerm;
    }
    if (selectDistinctResults) {
      selectionClause = 'distinct ' + selectionClause;
      countedClause = 'distinct ' + countedClause;
    }

    let orderByClause = '';
    if (columnOrders.length > 0) {
      orderByClause = 'order by ' + columnOrders.join(', ');
    }

    let totalResults: number | null = null;
    if (skip == 0) {
      const result = await db.query(
        `select count(*) from (select ${countedClause} from specimens
          ${whereClause} ${groupByClause}) as temp`
      );
      // postgres returns counts as strings
      totalResults = parseInt(result.rows[0].count);
    }
    const result = await db.query(
      `select ${selectionClause} from specimens
        ${whereClause} ${groupByClause} ${orderByClause} limit $1 offset $2`,
      [limit, skip]
    );

    const camelRows = result.rows.map((row) => {
      const data: any = toCamelRow(row);
      if (data.resultCount) {
        // postgres returns counts as strings
        data.resultCount = parseInt(data.resultCount);
      }
      return data;
    });
    return [camelRows, totalResults];
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

function _collectInIntegerList(
  conditionals: string[],
  columnName: string,
  integerList: number[] | null
): void {
  if (integerList) {
    conditionals.push(`${columnName} in (${integerList.join(',')})`);
  }
}

function _toEpochDay(date: Date): number {
  return Math.floor(date.getTime() / MILLIS_PER_DAY);
}
