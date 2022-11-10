/**
 * Class representing a vial of specimens all of the same taxon, also corresponding
 * to an occurrence record in GBIF and a row in James Reddell's spreadsheet.
 */

import type { DataOf } from '../../shared/data_of';
import {
  type DB,
  toCamelRow,
  toPostgresDate,
  toPostgresDateOrNull
} from '../integrations/postgres';
import { Taxon, type TaxonSource } from './taxon';
import { Location } from './location';
import type { ImportContext } from '../lib/import_context';
import { ImportFailure } from './import_failure';
import { Logs } from './logs';
import {
  type TaxonPathSpec,
  locationRanks,
  LogType,
  AQUATIC_KARST_FLAG,
  TERRESTRIAL_KARST_FLAG,
  STYGOBITE_FLAG,
  TROGLOBITE_FLAG,
  FEDERALLY_LISTED_FLAG
} from '../../shared/model';
import {
  stripTimeZone,
  stripTimeZoneOrNull,
  toDaysEpoch,
  toDateFromNumbers,
  toDateFromString,
  toZonelessDateString
} from '../../shared/date_tools';
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

const PARTIAL_DATES_REGEX =
  /(dated|started|ended)[:= ]+(\d{4})(?:[-](\d{1,2}))?(?:[-](\d{1,2}))?/gi;

const LAST_NAMES_REGEX = /([^ |,]+(?:, ?(jr.|ii|iii|2nd|3rd))?)(?:\||$)/g;
const SUBGENUS_REGEX = /subgenus[:= ]+([A-Za-z]+)/i;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_PITFALL_TRAP_COLLECTION_DAYS = 4 * 31;

export interface GbifRecord {
  // DarwinCore / GBIF field names

  // startDate must be constructed from GBIF's year/month/day fields, because
  // it randomly wrong, and not even consistent for the same catalog number.

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

  startDate?: string; // constructed from GBIF year/month/day
  recordedBy?: string; // collectors, |-delimited names, last name last
  dateIdentified?: string; // determination date (not just year)
  identifiedBy?: string; // determiners, |-delimited names, last name last
  eventRemarks?: string; // collecting event/info/habitat/end date
  occurrenceRemarks?: string;
  identificationRemarks?: string;
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
  partialStartDate: string | null;
  collectionEndDate: Date | null;
  partialEndDate: string | null;
  collectors: string | null; // |-delimited names, last name last
  // |-delimited lowercase last names, alphabetically sorted
  normalizedCollectors: string | null;
  determinationYear: number | null;
  determiners: string | null; // |-delimited names, last name last
  localityNotes: string | null;
  specimenNotes: string | null;
  determinationNotes: string | null;
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
  subgenus: string | null;
  speciesName: string | null;
  speciesID: number | null;
  subspeciesName: string | null;
  subspeciesID: number | null;
  taxonUnique: string;
  taxonAuthor: string | null;
  karstObligate: string | null;
  isFederallyListed: boolean;
  stateRank: string | null;
  tpwdStatus: string | null;

  // values cached from the locations table

  countyName: string | null;
  countyID: number | null;
  localityName: string;
  latitude: number | null;
  longitude: number | null;
  isAquaticKarst: boolean;
  isTerrestrialKarst: boolean;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: SpecimenData) {
    this.catalogNumber = data.catalogNumber;
    this.occurrenceGuid = data.occurrenceGuid; // GBIF occurrenceID (Specify co.GUID)
    this.taxonID = data.taxonID; // ID of most specific taxon
    this.localityID = data.localityID;
    this.collectionStartDate = stripTimeZoneOrNull(data.collectionStartDate);
    this.partialStartDate = data.partialStartDate;
    this.collectionEndDate = stripTimeZoneOrNull(data.collectionEndDate);
    this.partialEndDate = data.partialEndDate;
    this.collectors = data.collectors; // |-delimited names, last name last
    this.normalizedCollectors = data.normalizedCollectors;
    this.determinationYear = data.determinationYear;
    this.determiners = data.determiners; // |-delimited names, last name last
    this.localityNotes = data.localityNotes;
    this.specimenNotes = data.specimenNotes;
    this.determinationNotes = data.determinationNotes;
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
    this.subgenus = data.subgenus;
    this.speciesName = data.speciesName;
    this.speciesID = data.speciesID;
    this.subspeciesName = data.subspeciesName;
    this.subspeciesID = data.subspeciesID;
    this.taxonUnique = data.taxonUnique;
    this.taxonAuthor = data.taxonAuthor;
    this.karstObligate = data.karstObligate;
    this.isFederallyListed = data.isFederallyListed;
    this.stateRank = data.stateRank;
    this.tpwdStatus = data.tpwdStatus;
    this.countyName = data.countyName;
    this.countyID = data.countyID;
    this.localityName = data.localityName;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.isAquaticKarst = data.isAquaticKarst;
    this.isTerrestrialKarst = data.isTerrestrialKarst;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  // Must commit specimens before committing taxa and locations because
  // specimens references taxa and locations.
  static async commit(db: DB): Promise<void> {
    await db.query('delete from specimens where committed=true');
    await db.query('update specimens set committed=true');
  }

  static async create(
    db: DB,
    context: ImportContext,
    source: GbifRecord
  ): Promise<Specimen | null> {
    const problemList: string[] = [];
    let taxon: Taxon;
    let taxonNames: string[] = [];
    let taxonIDs: string[] = [];
    let subgenus = null;
    let location: Location;
    let locationNames: (string | null)[];
    let locationIDs: (string | null)[];
    let specimen: Specimen;
    let detRemarks = source.identificationRemarks;
    let determiners = source.identifiedBy?.replace(/ ?[|] ?/g, '|') || null;
    let typeStatus: string | null = source.typeStatus || null;

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
      if (lookup) {
        throw new ImportFailure(
          `Duplicate catalog number ${source.catalogNumber} (GBIF occurrenceID ${source.occurrenceID})`
        );
      }

      // Parse the subgenus from the determination remarks.

      let taxonSource: TaxonSource = source;
      if (detRemarks) {
        // Extract subgenus.

        const match = detRemarks.match(SUBGENUS_REGEX);
        if (match) subgenus = match[1];

        // Extract additional determiners, since Specify only allowed uploading one.

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

        // Extract undescribed status.

        if (typeStatus === null) {
          const lowerDetRemarks = detRemarks.toLowerCase();
          if (
            lowerDetRemarks.includes('n. sp.') ||
            lowerDetRemarks.includes('n. spp.') ||
            lowerDetRemarks.includes('new species') ||
            lowerDetRemarks.includes('new genus') ||
            lowerDetRemarks.includes('new family') ||
            lowerDetRemarks.includes('undescribed')
          ) {
            typeStatus = 'undescribed';
          }
        }
      }

      // Create the associated taxa and locations, if they don't already exist.

      taxon = await Taxon.getOrCreate(db, context, taxonSource, problemList);
      if (taxon.parentIDPath != '') {
        taxonIDs = taxon.parentIDPath.split(',');
        taxonNames = taxon.parentNamePath.split('|');
      }

      location = await Location.getOrCreate(db, context, source, problemList);
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
    // eventRemarks, when present.

    let startDate = source.startDate ? toDateFromString(source.startDate) : null;
    let startMatch: RegExpMatchArray | null = null;
    let partialStartDate: string | null = null;
    let endDate: Date | null = null;
    let endMatch: RegExpMatchArray | null = null;
    let partialEndDate: string | null = null;

    let localityNotes = source.eventRemarks || null;
    if (localityNotes) {
      const matches = localityNotes.matchAll(PARTIAL_DATES_REGEX);
      const reverseMatchesArray = Array.from(matches).reverse();
      if (reverseMatchesArray.length > 0) {
        // Extract the partial start date or partial/full end date, doing so
        // in reverse order of matching so that we can safely remove each
        // from localityNotes as it is encountered.

        for (const match of reverseMatchesArray) {
          // Assumes eventRemarks dates are in Texas time (Central).
          const firstMatch = match[1].toLowerCase();
          if (firstMatch == 'dated' || firstMatch == 'started') {
            [startDate, partialStartDate] = _parseStartDate(match);
            startMatch = match;
          } else {
            [endDate, partialEndDate] = _parseEndDate(match);
            endMatch = match;
          }
          localityNotes =
            localityNotes.substring(0, match.index) +
            localityNotes.substring(match.index! + match[0].length);
        }

        // Clean up localityNotes punctuation after date removals.

        localityNotes = localityNotes
          .replaceAll('; ;', '; ')
          .replaceAll(', ,', ', ')
          .replace('  ', ' ')
          .trim();
        if (localityNotes == '') {
          localityNotes = null;
        } else {
          if (',;'.includes(localityNotes[0])) {
            localityNotes = localityNotes.substring(1).trim();
          }
          if (',;'.includes(localityNotes[localityNotes.length - 1])) {
            localityNotes = localityNotes.substring(0, localityNotes.length - 1).trim();
          }
        }
        if (localityNotes == '') localityNotes = null;

        // Check dates for problems and provide reasonable recoveries.

        if (!startDate) {
          // Regex must have matched an end date.
          problemList.push(
            'End date given but no start date; assumed start date is end date'
          );
          [startDate, partialStartDate] = _parseStartDate(endMatch!);
          endDate = null;
          partialEndDate = null;
        }
        if (endDate) {
          const startTime = startDate.getTime();
          const endTime = endDate.getTime();
          if (startTime == endTime && partialEndDate === null) {
            // Handle case where end date is given even if equal to start date.
            endDate = null;
          } else if (startTime > endTime) {
            problemList.push(
              `Start date follows end date ${toZonelessDateString(
                endDate
              )}; end date ignored`
            );
            endDate = null;
            partialEndDate = null;
          }
        }
        if (
          endDate &&
          (!partialStartDate || partialStartDate.includes('-')) &&
          (!partialEndDate || partialEndDate.includes('-')) &&
          toDaysEpoch(endDate) - toDaysEpoch(startDate) >
            MAX_PITFALL_TRAP_COLLECTION_DAYS
        ) {
          problemList.push(
            `End date ${toZonelessDateString(endDate)} follows start date ` +
              `${toZonelessDateString(startDate)} by more than ` +
              `${MAX_PITFALL_TRAP_COLLECTION_DAYS} days; dropped end date`
          );
          endDate = null;
          partialEndDate = null;
        }
        if (partialStartDate && !partialEndDate) {
          // partial dates imply a range of searchable dates
          [endDate, partialEndDate] = _parseEndDate(startMatch!);
          partialEndDate = null;
        }
      }
    }

    // Parse the determination year. Depending on where the data was imported
    // from, the month and day may be zeros or random values.

    let determinationYear: number | null = null;
    if (source.dateIdentified) {
      const match = source.dateIdentified.match(/\d{4}/);
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

    const collectors = source.recordedBy?.replace(/ ?[|] ?/g, '|') || null;
    let normalizedCollectors = null;
    if (collectors !== null) {
      const matches = collectors.toLowerCase().matchAll(LAST_NAMES_REGEX);
      normalizedCollectors = Array.from(matches)
        .map((match) => match[1])
        .sort()
        .join('|');
    }

    // Determine karst characteristics.

    let karstObligate = null;
    if (taxon.flags & TROGLOBITE_FLAG) {
      karstObligate = 'troglobite';
    } else if (taxon.flags & STYGOBITE_FLAG) {
      karstObligate = 'stygobite';
    }
    const isAquaticKarst = (location.flags & AQUATIC_KARST_FLAG) != 0;
    const isTerrestrialKarst = (location.flags & TERRESTRIAL_KARST_FLAG) != 0;

    // Assemble the specimen instance from the data.

    specimen = new Specimen({
      catalogNumber: source.catalogNumber,
      occurrenceGuid: source.occurrenceID,
      taxonID: taxon.taxonID,
      localityID: location.locationID,
      collectionStartDate: startDate,
      partialStartDate,
      collectionEndDate: endDate,
      partialEndDate,
      collectors,
      normalizedCollectors,
      determinationYear,
      determiners,
      localityNotes: localityNotes,
      specimenNotes: source.occurrenceRemarks || null,
      determinationNotes: detRemarks || null,
      typeStatus,
      specimenCount: specimenCount || null /* 0 and NaN => null */,
      lifeStage: lifeStage || null,
      problems: problemList.length > 0 ? problemList.join(' | ') : null,
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
      subgenus,
      speciesName: getRankedName(taxonNames, 6, taxon.taxonName),
      speciesID: getRankedID(taxonIDs, 6, taxon.taxonID),
      subspeciesName: getRankedName(taxonNames, 7, taxon.taxonName),
      subspeciesID: getRankedID(taxonIDs, 7, taxon.taxonID),
      taxonUnique: taxon.uniqueName,
      taxonAuthor: taxon.author,
      karstObligate,
      isFederallyListed: !!(taxon.flags & FEDERALLY_LISTED_FLAG),
      stateRank: taxon.stateRank,
      tpwdStatus: taxon.tpwdStatus,
      countyName: getRankedName(locationNames, 3, location.locationName),
      countyID: getRankedID(locationIDs, 3, location.locationID),
      localityName: location.locationName,
      latitude: location.latitude,
      longitude: location.longitude,
      isAquaticKarst,
      isTerrestrialKarst
    });

    // Add the specimen to the database. Specimens are read-only.

    await db.query(
      `insert into specimens(
          catalog_number, occurrence_guid, taxon_id, locality_id,
          collection_start_date, partial_start_date, collection_end_date, partial_end_date,
          collectors, normalized_collectors, determination_year, determiners,
          locality_notes, specimen_notes, determination_notes,
          type_status, specimen_count, life_stage, problems, kingdom_name, kingdom_id,
          phylum_name, phylum_id, class_name, class_id, order_Name, order_id,
          family_name, family_id, genus_name, genus_id, subgenus, species_name, species_id,
          subspecies_name, subspecies_id, taxon_unique, taxon_author, karst_obligate,
          is_federally_listed, state_rank, tpwd_status,
          county_name, county_id, locality_name, latitude, longitude,
          is_aquatic_karst, is_terrestrial_karst
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
          $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49)`,
      [
        specimen.catalogNumber,
        specimen.occurrenceGuid,
        specimen.taxonID,
        specimen.localityID,
        toPostgresDateOrNull(specimen.collectionStartDate),
        partialStartDate,
        toPostgresDateOrNull(specimen.collectionEndDate),
        partialEndDate,
        specimen.collectors,
        specimen.normalizedCollectors,
        specimen.determinationYear,
        specimen.determiners,
        specimen.localityNotes,
        specimen.specimenNotes,
        specimen.determinationNotes,
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
        subgenus,
        specimen.speciesName,
        specimen.speciesID,
        specimen.subspeciesName,
        specimen.subspeciesID,
        specimen.taxonUnique,
        specimen.taxonAuthor,
        // @ts-ignore incorrect type def
        specimen.karstObligate,
        // @ts-ignore incorrect type def
        specimen.isFederallyListed,
        specimen.stateRank,
        specimen.tpwdStatus,
        specimen.countyName,
        specimen.countyID,
        specimen.localityName,
        specimen.latitude,
        specimen.longitude,
        // @ts-ignore incorrect type def
        specimen.isAquaticKarst,
        // @ts-ignore incorrect type def
        specimen.isTerrestrialKarst
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

  static async getMissingAquaticKarstLocationIDs(
    db: DB,
    committed: boolean
  ): Promise<number[]> {
    const result = await db.query(
      `select distinct locality_id from specimens where karst_obligate='stygobite'
        and is_aquatic_karst=false and committed=$1`,
      [
        // @ts-ignore
        committed
      ]
    );
    return result.rows.map((row) => row.locality_id);
  }

  static async getMissingTerrestrialKarstLocationIDs(
    db: DB,
    committed: boolean
  ): Promise<number[]> {
    const result = await db.query(
      `select distinct locality_id from specimens where karst_obligate='troglobite'
        and is_terrestrial_karst=false and committed=$1`,
      [
        // @ts-ignore
        committed
      ]
    );
    return result.rows.map((row) => row.locality_id);
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
          `(collection_start_date >= '${fromDate}' or
            (collection_end_date is not null and
              collection_end_date >= '${fromDate}'))`
        );
      }
      if (dateFilter.throughDateMillis !== null) {
        const throughDate = toPostgresDate(new Date(dateFilter.throughDateMillis));
        whereComponents.push(`collection_start_date <= '${throughDate}'`);
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
        if (columnID == QueryColumnID.RecordCount) {
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
          whereComponents.push(option.sql.replaceAll('X', columnInfo.column1));
        }
      }
      const sortColumnName = columnInfo.asName ? columnInfo.asName : columnInfo.column1;
      if (columnSpec.ascending !== null) {
        if (columnSpec.ascending) {
          columnOrders.push(sortColumnName);
        } else {
          columnOrders.push(sortColumnName + ' desc');
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
    // console.log(
    //   '**** query',
    //   `select ${selectionClause} from specimens
    // ${whereClause} ${groupByClause} ${orderByClause}`
    // );
    const result = await db.query(
      `select ${selectionClause} from specimens
        ${whereClause} ${groupByClause} ${orderByClause} limit $1 offset $2`,
      [limit, skip]
    );

    const camelRows = result.rows.map((row) => {
      const data: any = toCamelRow(row);
      if (data.recordCount) {
        // postgres returns counts as strings
        data.recordCount = parseInt(data.recordCount);
      }
      if (data.collectionStartDate) {
        data.collectionStartDate = stripTimeZone(data.collectionStartDate);
      }
      if (data.collectionEndDate) {
        data.collectionEndDate = stripTimeZone(data.collectionEndDate);
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

  static async assignAquaticKarstLocations(
    db: DB,
    locationIDs: number[]
  ): Promise<void> {
    await db.query(
      `update specimens set is_aquatic_karst=true where locality_id=any ($1)`,
      [
        // @ts-ignore
        locationIDs
      ]
    );
  }

  static async assignTerrestrialKarstLocations(
    db: DB,
    locationIDs: number[]
  ): Promise<void> {
    await db.query(
      `update specimens set is_terrestrial_karst=true where locality_id=any ($1)`,
      [
        // @ts-ignore
        locationIDs
      ]
    );
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
  source: GbifRecord,
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
  if (failed) {
    await Logs.postError(db, LogType.ImportRecord, catalogNumber, line);
  } else {
    await Logs.postWarning(db, LogType.ImportRecord, catalogNumber, line);
  }
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

function _parseStartDate(match: RegExpMatchArray): [Date, string | null] {
  const year = parseInt(match[2]);
  if (match[3] === undefined) {
    return [toDateFromNumbers(year, 1, 1), match[2]];
  } else {
    const month = parseInt(match[3]);
    if (match[4] === undefined) {
      const date = toDateFromNumbers(year, month, 1);
      return [date, `${match[2]}-${match[3]}`];
    }
    const day = parseInt(match[4]);
    return [toDateFromNumbers(year, month, day), null];
  }
}

function _parseEndDate(match: RegExpMatchArray): [Date, string | null] {
  let year = parseInt(match[2]);
  if (match[3] === undefined) {
    return [toDateFromNumbers(year, 12, 31), match[2]];
  } else {
    let month = parseInt(match[3]);
    if (match[4] === undefined) {
      if (++month == 13) {
        ++year;
        month = 1;
      }
      const date = new Date(
        toDateFromNumbers(year, month, 1).getTime() - MILLIS_PER_DAY
      );
      return [date, `${match[2]}-${match[3]}`];
    }
    const day = parseInt(match[4]);
    return [toDateFromNumbers(year, month, day), null];
  }
}
