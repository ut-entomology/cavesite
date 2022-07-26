/**
 * Support for conveying general queries and query results between client and server
 */

// TODO: revisit need to return taxon/location IDs in general query

export const EARLIEST_RECORD_DATE = new Date('1/1/1930');

export enum QueryColumnID {
  // in default order of appearance
  CatalogNumber,
  CollectionStartDate,
  CollectionEndDate,
  County,
  Locality,
  TypeStatus,
  TaxonUnique,
  // these do not initially appear, but QueryColumnInfo provides this info
  ResultCount,
  Phylum,
  Class,
  Order,
  Family,
  Genus,
  Subgenus,
  Species,
  Subspecies,
  Obligate,
  SpecimenCount,
  LifeStage,
  Latitude,
  Longitude,
  Collectors,
  CollectionRemarks,
  Determiners,
  DeterminationYear,
  DeterminationRemarks,
  OccurrenceRemarks,
  Problems,
  _LENGTH
}

export interface QueryColumnSpec {
  columnID: QueryColumnID;
  ascending: boolean | null; // null => not sorted
  optionText: string | null; // text of chosen value option
}

export interface QueryDateFilter {
  fromDateMillis: number | null; // UNIX time millis
  throughDateMillis: number | null; // UNIX time millis
}

export interface QueryLocationFilter {
  countyIDs: number[] | null;
  localityIDs: number[] | null;
}

export interface QueryTaxonFilter {
  phylumIDs: number[] | null;
  classIDs: number[] | null;
  orderIDs: number[] | null;
  familyIDs: number[] | null;
  genusIDs: number[] | null;
  speciesIDs: number[] | null;
  subspeciesIDs: number[] | null;
}

export interface GeneralQuery {
  columnSpecs: QueryColumnSpec[];
  dateFilter: QueryDateFilter | null;
  locationFilter: QueryLocationFilter | null;
  taxonFilter: QueryTaxonFilter | null;
}

/**
 * Query records are query results, which are subsets of the specimens table.
 * All columns are optional, but columns that must occur in groups are
 * grouped together in the list below. This allows queries to return the
 * distinct sets without repeating entries, providing query flexibility.
 */
export interface QueryRow {
  resultCount?: number;

  catalogNumber?: string;
  occurrenceGuid?: string;

  collectionStartDate?: Date | null;
  partialStartDate?: string | null;

  collectionEndDate?: Date | null;
  partialEndDate?: string | null;

  collectors?: string | null; // |-delimited names, last name last

  determinationYear?: number | null;

  determiners?: string | null; // |-delimited names, last name last

  collectionRemarks?: string | null;

  occurrenceRemarks?: string | null;

  determinationRemarks?: string | null;

  typeStatus?: string | null;

  specimenCount?: number | null;

  problems?: string | null;

  lifeStage?: string | null;

  phylumName?: string | null;
  phylumID?: number | null;

  className?: string | null;
  classID?: number | null;

  orderName?: string | null;
  orderID?: number | null;

  familyName?: string | null;
  familyID?: number | null;

  genusName?: string | null;
  genusID?: number | null;

  subgenus?: string | null;

  speciesName?: string | null;
  speciesID?: number | null;

  subspeciesName?: string | null;
  subspeciesID?: number | null;

  taxonUnique?: string;
  taxonID?: number;
  taxonAuthor?: string | null;

  obligate?: string | null;

  countyName?: string | null;
  countyID?: number | null;

  localityName?: string | null;
  localityID?: number | null;

  latitude?: number | null;
  longitude?: number | null;
}

export interface QueryOption {
  text: string; // text to present in dropdown
  sql: string | null; // SQL; column name replaces 'X'; null => any value
}

export interface QueryColumnInfo {
  columnID: QueryColumnID;
  fullName: string; // name to display for column when configuring filter
  abbrName: string | null; // name to display for column in column header
  description: string; // information about the column
  defaultSelection: boolean; // whether query requests the column by default
  column1: string; // name of column in database
  column2?: string; // optional complementary dependent column
  asName?: string; // result column name, if different from column1
  options: QueryOption[] | null; // optional constraints on returned values
  defaultEmWidth: number; // default width of the column in em,
  columnClass: string | null; // CSS class for query column cells
  getValue: (row: QueryRow) => string | number; // gets displayed value
}

export type QueryColumnInfoMap = Record<number, QueryColumnInfo>;
export const columnInfoMap: QueryColumnInfoMap = [];

const nullableOptions: QueryOption[] = [
  // postgres won't crash checking for null on non-nullables
  { text: 'Any value', sql: null },
  { text: 'Non-blank', sql: 'X is not null' },
  { text: 'Blank', sql: 'X is null' }
];

const setColumnInfo = (columnInfo: QueryColumnInfo) => {
  columnInfoMap[columnInfo.columnID] = columnInfo;
};
const getDateValue = (date?: Date | null) => {
  return date ? new Date(date).toLocaleDateString() : '';
};
const getNames = (names?: string | null) => (names ? names.replace('|', '; ') : '');
const getNumber = (num?: number | null) => (num ? num.toString() : '');

setColumnInfo({
  columnID: QueryColumnID.ResultCount,
  fullName: 'Result Count',
  abbrName: 'Results',
  description: 'Number of results in the data that are identical to the given result.',
  defaultSelection: false,
  column1: 'count(*)',
  asName: 'result_count',
  options: null,
  defaultEmWidth: 4,
  columnClass: 'center',
  getValue: (row: QueryRow) => getNumber(row.resultCount)
});
setColumnInfo({
  columnID: QueryColumnID.CatalogNumber,
  fullName: 'Catalog Number',
  abbrName: 'Catalog No.',
  description: "Catalog number of the specimen(s) in UT Austin's Specify database.",
  defaultSelection: true,
  column1: 'catalog_number',
  column2: 'occurrence_guid',
  defaultEmWidth: 7,
  options: null,
  columnClass: null,
  getValue: (row: QueryRow) => row.catalogNumber || ''
});
setColumnInfo({
  columnID: QueryColumnID.CollectionStartDate,
  fullName: 'Starting Collection Date',
  abbrName: 'Start Date',
  description: 'First day of collection, which may be the only collection date',
  defaultSelection: true,
  column1: 'collection_start_date',
  column2: 'partial_start_date',
  defaultEmWidth: 6,
  options: nullableOptions,
  columnClass: 'center',
  getValue: (row: QueryRow) =>
    row.partialStartDate
      ? _toDisplayedPartialDate(row.partialStartDate)
      : getDateValue(row.collectionStartDate)
});
setColumnInfo({
  columnID: QueryColumnID.CollectionEndDate,
  fullName: 'Ending Collection Date',
  abbrName: 'End Date',
  description: 'Last day of collection, if collected over more than one day',
  defaultSelection: true,
  column1: 'collection_end_date',
  column2: 'partial_end_date',
  options: nullableOptions,
  defaultEmWidth: 6,
  columnClass: 'center',
  getValue: (row: QueryRow) => {
    if (row.partialEndDate) return _toDisplayedPartialDate(row.partialEndDate);
    // Don't return a blank end date, because we don't know when the end date was,
    // and because the user might get confused over why the record doesn't show
    // in blank end date searches.
    if (row.partialStartDate) return _toDisplayedPartialDate(row.partialStartDate);
    return getDateValue(row.collectionEndDate);
  }
});
setColumnInfo({
  columnID: QueryColumnID.Collectors,
  fullName: 'Collector Names',
  abbrName: 'Collectors',
  description: 'Names of the participating collectors',
  defaultSelection: false,
  column1: 'collectors',
  options: nullableOptions,
  defaultEmWidth: 16,
  columnClass: null,
  getValue: (row: QueryRow) => getNames(row.collectors)
});
setColumnInfo({
  columnID: QueryColumnID.Determiners,
  fullName: 'Determiner Names',
  abbrName: 'Determiners',
  description: 'Names of the determiners',
  defaultSelection: false,
  column1: 'determiners',
  options: nullableOptions,
  defaultEmWidth: 8,
  columnClass: null,
  getValue: (row: QueryRow) => getNames(row.determiners)
});
setColumnInfo({
  columnID: QueryColumnID.DeterminationYear,
  fullName: 'Determination Year',
  abbrName: 'Det. Year',
  description: 'Names of the determiners',
  defaultSelection: false,
  column1: 'determination_year',
  options: nullableOptions,
  defaultEmWidth: 4,
  columnClass: 'center',
  getValue: (row: QueryRow) => getNumber(row.determinationYear)
});
setColumnInfo({
  columnID: QueryColumnID.CollectionRemarks,
  fullName: 'Collection Remarks',
  abbrName: null,
  description: 'Remarks about the collecting trip and habitat',
  defaultSelection: false,
  column1: 'collection_remarks',
  options: nullableOptions,
  defaultEmWidth: 16,
  columnClass: null,
  getValue: (row: QueryRow) => row.collectionRemarks || ''
});
setColumnInfo({
  columnID: QueryColumnID.OccurrenceRemarks,
  fullName: 'Occurrence Remarks',
  abbrName: null,
  description: 'Remarks about the specimens collected',
  defaultSelection: false,
  column1: 'occurrence_remarks',
  options: nullableOptions,
  defaultEmWidth: 16,
  columnClass: null,
  getValue: (row: QueryRow) => row.occurrenceRemarks || ''
});
setColumnInfo({
  columnID: QueryColumnID.DeterminationRemarks,
  fullName: 'Determination Remarks',
  abbrName: 'Det. Remarks',
  description: 'Remarks about the determination',
  defaultSelection: false,
  column1: 'determination_remarks',
  options: nullableOptions,
  defaultEmWidth: 16,
  columnClass: null,
  getValue: (row: QueryRow) => row.determinationRemarks || ''
});
setColumnInfo({
  columnID: QueryColumnID.TypeStatus,
  fullName: 'Type Status',
  abbrName: null,
  description:
    'Type status of this particular specimen, and whether it is undescribed.',
  defaultSelection: true,
  column1: 'type_status',
  options: [
    { text: 'Any value', sql: null },
    { text: 'Undescribed', sql: "X='undescribed'" },
    { text: 'Any type', sql: "X is not null and X!='undescribed'" },
    { text: 'Non-blank', sql: 'X is not null' },
    { text: 'Blank', sql: 'X is null' }
  ],
  defaultEmWidth: 7,
  columnClass: null,
  getValue: (row: QueryRow) => row.typeStatus || ''
});
setColumnInfo({
  columnID: QueryColumnID.SpecimenCount,
  fullName: 'Specimen Count',
  abbrName: 'Count',
  description: 'The number of specimens collected',
  defaultSelection: false,
  column1: 'specimen_count',
  options: nullableOptions, // there are no 0s, only nulls
  defaultEmWidth: 4,
  columnClass: 'center',
  getValue: (row: QueryRow) => row.specimenCount || ''
});
setColumnInfo({
  columnID: QueryColumnID.LifeStage,
  fullName: 'Life Stage',
  abbrName: 'Stage',
  description: 'Life stage of specimens (adult = includes adults; blank = unknown)',
  defaultSelection: false,
  column1: 'life_stage',
  options: [
    { text: 'Any value', sql: null },
    { text: 'Adult', sql: "X='adult'" },
    { text: 'Immature', sql: "X is not null and X!='adult'" },
    { text: 'Non-blank', sql: 'X is not null' },
    { text: 'Blank', sql: 'X is null' }
  ],
  defaultEmWidth: 4,
  columnClass: 'center',
  getValue: (row: QueryRow) => row.lifeStage || ''
});
setColumnInfo({
  columnID: QueryColumnID.Problems,
  fullName: 'Import Problems',
  abbrName: null,
  description: 'Problems encountered importing the data from GBIF',
  defaultSelection: false,
  column1: 'problems',
  options: nullableOptions,
  defaultEmWidth: 16,
  columnClass: null,
  getValue: (row: QueryRow) => row.problems || ''
});
setColumnInfo({
  columnID: QueryColumnID.Phylum,
  fullName: 'Phylum',
  abbrName: null,
  description: 'Phylum determined for the specimen',
  defaultSelection: false,
  column1: 'phylum_name',
  column2: 'phylum_id',
  options: nullableOptions,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => row.phylumName || ''
});
setColumnInfo({
  columnID: QueryColumnID.Class,
  fullName: 'Class',
  abbrName: null,
  description: 'Class determined for the specimen',
  defaultSelection: false,
  column1: 'class_name',
  column2: 'class_id',
  options: nullableOptions,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => row.className || ''
});
setColumnInfo({
  columnID: QueryColumnID.Order,
  fullName: 'Order',
  abbrName: null,
  description: 'Order determined for the specimen',
  defaultSelection: false,
  column1: 'order_name',
  column2: 'order_id',
  options: nullableOptions,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => row.orderName || ''
});
setColumnInfo({
  columnID: QueryColumnID.Family,
  fullName: 'Family',
  abbrName: null,
  description: 'Family determined for the specimen',
  defaultSelection: false,
  column1: 'family_name',
  column2: 'family_id',
  options: nullableOptions,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => row.familyName || ''
});
setColumnInfo({
  columnID: QueryColumnID.Genus,
  fullName: 'Genus',
  abbrName: null,
  description: 'Genus determined for the specimen',
  defaultSelection: false,
  column1: 'genus_name',
  column2: 'genus_id',
  options: nullableOptions,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => _toItalic(row.genusName)
});
setColumnInfo({
  columnID: QueryColumnID.Subgenus,
  fullName: 'Subgenus',
  abbrName: null,
  description: 'Subgenus determined for the specimen, if any',
  defaultSelection: false,
  column1: 'subgenus',
  options: nullableOptions,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => row.subgenus || ''
});
setColumnInfo({
  columnID: QueryColumnID.Species,
  fullName: 'Species',
  abbrName: null,
  description: 'Specific epithet determined for the specimen',
  defaultSelection: false,
  column1: 'species_name',
  column2: 'species_id',
  options: nullableOptions,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => _toItalic(row.speciesName)
});
setColumnInfo({
  columnID: QueryColumnID.Subspecies,
  fullName: 'Subspecies',
  abbrName: null,
  description: 'Infraspecific epithet determined for the specimen',
  defaultSelection: false,
  column1: 'subspecies_name',
  column2: 'subspecies_id',
  options: nullableOptions,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => _toItalic(row.subspeciesName)
});
setColumnInfo({
  columnID: QueryColumnID.TaxonUnique,
  fullName: 'Scientific Name',
  abbrName: null,
  description: 'Most-specific taxon determined, with author and date when available',
  defaultSelection: true,
  column1: 'taxon_unique',
  // genus_id needed for italics determination
  column2: 'taxon_author, taxon_id, genus_id',
  options: null,
  defaultEmWidth: 12,
  columnClass: null,
  getValue: (row: QueryRow) => {
    const name = row.genusID ? _toItalic(row.taxonUnique) : row.taxonUnique!;
    return name + (row.taxonAuthor ? ' ' + row.taxonAuthor : '');
  }
});
setColumnInfo({
  columnID: QueryColumnID.Obligate,
  fullName: 'Cave Obligate',
  abbrName: null,
  description: 'Whether the taxon is cave obligate',
  defaultSelection: false,
  column1: 'obligate',
  options: [
    { text: 'Any value', sql: null },
    { text: 'Yes', sql: 'X is not null' },
    { text: 'No', sql: 'X is null' }
  ],
  defaultEmWidth: 8,
  columnClass: 'center',
  getValue: (row: QueryRow) => (row.obligate ? 'Yes' : 'No')
});
setColumnInfo({
  columnID: QueryColumnID.County,
  fullName: 'County',
  abbrName: null,
  description: 'County of Texas in which specimen was found',
  defaultSelection: true,
  column1: 'county_name',
  column2: 'county_id',
  options: nullableOptions,
  defaultEmWidth: 16,
  columnClass: null,
  getValue: (row: QueryRow) => row.countyName || ''
});
setColumnInfo({
  columnID: QueryColumnID.Locality,
  fullName: 'Locality',
  abbrName: null,
  description: 'Locality within county where specimen was found',
  defaultSelection: true,
  column1: 'locality_name',
  column2: 'locality_id',
  options: null,
  defaultEmWidth: 20,
  columnClass: null,
  getValue: (row: QueryRow) => row.localityName || ''
});
setColumnInfo({
  columnID: QueryColumnID.Latitude,
  fullName: 'Latitude',
  abbrName: null,
  description: 'Latitude of cave at which specimen was found',
  defaultSelection: false,
  column1: 'latitude',
  asName: 'latitude',
  options: nullableOptions,
  defaultEmWidth: 6,
  columnClass: null,
  getValue: (row: QueryRow) => getNumber(row.latitude)
});
setColumnInfo({
  columnID: QueryColumnID.Longitude,
  fullName: 'Longitude',
  abbrName: null,
  description: 'Longitude of cave at which specimen was found',
  defaultSelection: false,
  column1: 'longitude',
  asName: 'longitude',
  options: nullableOptions,
  defaultEmWidth: 6,
  columnClass: null,
  getValue: (row: QueryRow) => getNumber(row.longitude)
});

function _toItalic(name?: string | null) {
  return name ? `<i>${name}</i>` : '';
}

function _toDisplayedPartialDate(partialDate: string): string {
  const dashOffset = partialDate.indexOf('-');
  if (dashOffset < 0) return partialDate; // just the year
  const year = partialDate.substring(0, dashOffset);
  const month = partialDate.substring(dashOffset + 1);
  // parse the month to strip any leading zero
  return `${parseInt(month)}/${year}`;
}
