/**
 * Support for conveying general queries and query results between client and server.
 */
import { toLocalDate } from '../shared/date_tools';

export const EARLIEST_RECORD_DATE = new Date('1/1/1930');

export enum QueryColumnID {
  CatalogNumber = 'catalog number',
  CollectionStartDate = 'start date',
  CollectionEndDate = 'end date',
  Locality = 'locality',
  County = 'county',
  Latitude = 'latitude',
  Longitude = 'longitude',
  IsAquaticKarst = 'aquatic karst',
  IsTerrestrialKarst = 'terrestrial karst',
  TypeStatus = 'type status',
  Phylum = 'phylum',
  Class = 'class',
  Order = 'order',
  Family = 'family',
  Genus = 'genus',
  Subgenus = 'subgenus',
  Species = 'species epithet',
  Subspecies = 'subspecies epithet',
  TaxonUnique = 'scientific name',
  KarstObligate = 'karst obligate',
  IsFederallyListed = 'federally listed',
  TexasStateRank = 'Texas state rank',
  TpwdStatus = 'TPWD status',
  SpecimenCount = 'specimen count',
  LifeStage = 'life stage',
  Collectors = 'collectors',
  LocalityNotes = 'locality notes',
  Determiners = 'determiners',
  DeterminationYear = 'determination year',
  DeterminationNotes = 'determination notes',
  SpecimenNotes = 'specimen notes',
  RecordCount = 'record count',
  Problems = 'problems'
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
  recordCount?: number;

  catalogNumber?: string;
  occurrenceGuid?: string;

  collectionStartDate?: Date | null;
  partialStartDate?: string | null;

  collectionEndDate?: Date | null;
  partialEndDate?: string | null;

  collectors?: string | null; // |-delimited names, last name last

  determinationYear?: number | null;

  determiners?: string | null; // |-delimited names, last name last

  localityNotes?: string | null;

  specimenNotes?: string | null;

  determinationNotes?: string | null;

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

  karstObligate?: string | null;

  isFederallyListed?: boolean;

  stateRank?: string;

  tpwdStatus?: string;

  countyName?: string | null;
  countyID?: number | null;

  localityName?: string | null;
  localityID?: number | null;

  latitude?: number | null;
  longitude?: number | null;

  isAquaticKarst?: boolean;

  isTerrestrialKarst?: boolean;
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
  column1: string; // name of column in database
  column2?: string; // optional complementary dependent column
  asName?: string; // result column name, if different from column1
  options: QueryOption[] | null; // optional constraints on returned values
  defaultEmWidth: number; // default width of the column in em,
  columnClass: string | null; // CSS class for query column cells
  getValue: (row: QueryRow) => string | number; // gets displayed value
}

// @ts-ignore as the column IDs will soon be added
export const columnInfoMap: Record<QueryColumnID, QueryColumnInfo> = {};

const nullableOptions: QueryOption[] = [
  // postgres won't crash checking for null on non-nullables
  { text: 'Any value', sql: null },
  { text: 'Non-blank', sql: 'X is not null' },
  { text: 'Blank', sql: 'X is null' }
];
const yesNoOptions: QueryOption[] = [
  { text: 'Any value', sql: null },
  { text: 'Yes', sql: 'X = true' },
  { text: 'No', sql: 'X = false' }
];

const setColumnInfo = (columnInfo: QueryColumnInfo) => {
  columnInfoMap[columnInfo.columnID] = columnInfo;
};
const getDateValue = (date?: Date | null) => {
  return date ? toLocalDate(new Date(date)) : '';
};
const getNames = (names?: string | null) => (names ? names.replace('|', '; ') : '');
const getNumber = (num?: number | null) => (num ? num.toString() : '');

setColumnInfo({
  columnID: QueryColumnID.RecordCount,
  fullName: 'Record Count',
  abbrName: 'Records',
  description: 'Number of specimen records associated with the resulting row.',
  column1: 'count(*)',
  asName: 'record_count',
  options: null,
  defaultEmWidth: 5,
  columnClass: 'center',
  getValue: (row: QueryRow) => getNumber(row.recordCount)
});
setColumnInfo({
  columnID: QueryColumnID.CatalogNumber,
  fullName: 'Catalog Number',
  abbrName: 'Catalog No.',
  description: "Catalog number of the specimen(s) in UT Austin's Specify database.",
  column1: 'catalog_number',
  column2: 'occurrence_guid',
  defaultEmWidth: 6,
  options: null,
  columnClass: null,
  getValue: (row: QueryRow) => row.catalogNumber || ''
});
setColumnInfo({
  columnID: QueryColumnID.CollectionStartDate,
  fullName: 'Date Collection Started',
  abbrName: 'Start Date',
  description: 'First day of collection, which may be the only collection date',
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
  fullName: 'Date Collection Ended',
  abbrName: 'End Date',
  description: 'Last day of collection, if collected over more than one day',
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
  column1: 'determiners',
  options: nullableOptions,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => getNames(row.determiners)
});
setColumnInfo({
  columnID: QueryColumnID.DeterminationYear,
  fullName: 'Determination Year',
  abbrName: 'Det. Year',
  description: 'Names of the determiners',
  column1: 'determination_year',
  options: nullableOptions,
  defaultEmWidth: 6,
  columnClass: 'center',
  getValue: (row: QueryRow) => getNumber(row.determinationYear)
});
setColumnInfo({
  columnID: QueryColumnID.LocalityNotes,
  fullName: 'Locality & Habitat Notes',
  abbrName: null,
  description: 'Notes on the location and habitat',
  column1: 'locality_notes',
  options: nullableOptions,
  defaultEmWidth: 16,
  columnClass: null,
  getValue: (row: QueryRow) => row.localityNotes || ''
});
setColumnInfo({
  columnID: QueryColumnID.SpecimenNotes,
  fullName: 'Specimen Notes',
  abbrName: null,
  description: 'Notes about the specimens collected',
  column1: 'specimen_notes',
  options: nullableOptions,
  defaultEmWidth: 16,
  columnClass: null,
  getValue: (row: QueryRow) => row.specimenNotes || ''
});
setColumnInfo({
  columnID: QueryColumnID.DeterminationNotes,
  fullName: 'Determination Notes',
  abbrName: 'Det. Notes',
  description: 'Notes on the determination',
  column1: 'determination_notes',
  options: nullableOptions,
  defaultEmWidth: 12,
  columnClass: null,
  getValue: (row: QueryRow) => row.determinationNotes || ''
});
setColumnInfo({
  columnID: QueryColumnID.TypeStatus,
  fullName: 'Type Status',
  abbrName: null,
  description:
    'Type status of this particular specimen, and whether it is undescribed.',
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
  abbrName: 'Specimens',
  description: 'The number of specimens collected',
  column1: 'specimen_count',
  options: nullableOptions, // there are no 0s, only nulls
  defaultEmWidth: 6,
  columnClass: 'center',
  getValue: (row: QueryRow) => row.specimenCount || ''
});
setColumnInfo({
  columnID: QueryColumnID.LifeStage,
  fullName: 'Life Stage',
  abbrName: 'Stage',
  description: 'Life stage of specimens (adult = includes adults; blank = unknown)',
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
  column1: 'phylum_name',
  column2: 'phylum_id',
  options: nullableOptions,
  defaultEmWidth: 8,
  columnClass: null,
  getValue: (row: QueryRow) => row.phylumName || ''
});
setColumnInfo({
  columnID: QueryColumnID.Class,
  fullName: 'Class',
  abbrName: null,
  description: 'Class determined for the specimen',
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
  column1: 'subgenus',
  options: nullableOptions,
  defaultEmWidth: 6,
  columnClass: null,
  getValue: (row: QueryRow) => row.subgenus || ''
});
setColumnInfo({
  columnID: QueryColumnID.Species,
  fullName: 'Species Epithet',
  abbrName: 'Species',
  description: 'Specific epithet determined for the specimen',
  column1: 'species_name',
  column2: 'species_id',
  options: nullableOptions,
  defaultEmWidth: 9,
  columnClass: null,
  getValue: (row: QueryRow) => _toItalic(row.speciesName)
});
setColumnInfo({
  columnID: QueryColumnID.Subspecies,
  fullName: 'Subspecies Epithet',
  abbrName: 'Subspecies',
  description: 'Infraspecific epithet determined for the specimen',
  column1: 'subspecies_name',
  column2: 'subspecies_id',
  options: nullableOptions,
  defaultEmWidth: 9,
  columnClass: null,
  getValue: (row: QueryRow) => _toItalic(row.subspeciesName)
});
setColumnInfo({
  columnID: QueryColumnID.TaxonUnique,
  fullName: 'Scientific Name',
  abbrName: null,
  description: 'Most-specific taxon determined, with author and date when available',
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
  columnID: QueryColumnID.KarstObligate,
  fullName: 'Karst Obligate?',
  abbrName: null,
  description: 'Whether the taxon is stygobitic or troglobitic',
  column1: 'karst_obligate',
  options: [
    { text: 'Any value', sql: null },
    { text: 'Yes', sql: 'X is not null' },
    { text: 'Stygobite', sql: "X='stygobite'" },
    { text: 'Troglobite', sql: "X='troglobite'" },
    { text: 'No', sql: 'X is null' }
  ],
  defaultEmWidth: 8,
  columnClass: 'center',
  getValue: (row: QueryRow) => row.karstObligate || 'no'
});
setColumnInfo({
  columnID: QueryColumnID.IsFederallyListed,
  fullName: 'Federally Listed?',
  abbrName: null,
  description: 'Whether the taxon is a federally listed species',
  column1: 'is_federally_listed',
  options: yesNoOptions,
  defaultEmWidth: 6,
  columnClass: 'center',
  getValue: (row: QueryRow) => (row.isFederallyListed ? 'Yes' : 'No')
});
setColumnInfo({
  columnID: QueryColumnID.TexasStateRank,
  fullName: 'Texas State Rank',
  abbrName: 'State Rank',
  description: 'State of Texas conservation rank',
  column1: 'state_rank',
  options: nullableOptions,
  defaultEmWidth: 6,
  columnClass: 'center',
  getValue: (row: QueryRow) => row.stateRank || ''
});
setColumnInfo({
  columnID: QueryColumnID.TpwdStatus,
  fullName: 'TPWD Status',
  abbrName: null,
  description: 'TPWD conservation status',
  column1: 'tpwd_status',
  options: [
    { text: 'Any value', sql: null },
    { text: 'SGCN', sql: "X='SGCN'" },
    { text: 'Non-blank', sql: 'X is not null' },
    { text: 'Blank', sql: 'X is null' }
  ],
  defaultEmWidth: 6,
  columnClass: 'center',
  getValue: (row: QueryRow) => row.tpwdStatus || ''
});
setColumnInfo({
  columnID: QueryColumnID.County,
  fullName: 'County',
  abbrName: null,
  description: 'County of Texas in which specimen was found',
  column1: 'county_name',
  column2: 'county_id',
  options: nullableOptions,
  defaultEmWidth: 12,
  columnClass: null,
  getValue: (row: QueryRow) => row.countyName || ''
});
setColumnInfo({
  columnID: QueryColumnID.Locality,
  fullName: 'Locality',
  abbrName: null,
  description: 'Locality within county where specimen was found',
  column1: 'locality_name',
  column2: 'locality_id',
  options: null,
  defaultEmWidth: 16,
  columnClass: null,
  getValue: (row: QueryRow) => row.localityName || ''
});
setColumnInfo({
  columnID: QueryColumnID.IsAquaticKarst,
  fullName: 'Aquatic Karst?',
  abbrName: null,
  description: 'Whether the locality is aquatic karst',
  column1: 'is_aquatic_karst',
  options: yesNoOptions,
  defaultEmWidth: 6,
  columnClass: 'center',
  getValue: (row: QueryRow) => (row.isAquaticKarst ? 'Yes' : 'No')
});
setColumnInfo({
  columnID: QueryColumnID.IsTerrestrialKarst,
  fullName: 'Terrestrial Karst?',
  abbrName: null,
  description: 'Whether the locality is terrestrial karst',
  column1: 'is_terrestrial_karst',
  options: yesNoOptions,
  defaultEmWidth: 6,
  columnClass: 'center',
  getValue: (row: QueryRow) => (row.isTerrestrialKarst ? 'Yes' : 'No')
});
setColumnInfo({
  columnID: QueryColumnID.Latitude,
  fullName: 'Latitude',
  abbrName: null,
  description: 'Latitude of cave at which specimen was found',
  column1: 'latitude',
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
  column1: 'longitude',
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
