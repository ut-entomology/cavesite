import { CAVE_OBLIGATE_DESIGNATION } from '../../shared/model';
import { QueryColumnID, QueryRow } from '../../shared/user_query';

export interface QueryColumnInfo {
  columnID: QueryColumnID;
  fullName: string; // name to display for column when configuring filter
  abbrName: string | null; // name to display for column in column header
  description: string; // information about the column
  defaultSelection: boolean; // whether query requests the column by default
  nullable: boolean | string[]; // whether can be null, or [null, not-null] labels
  defaultEmWidth: number; // default width of the column in em,
  columnClass: string | null; // CSS class for query column cells
  getValue: (row: QueryRow) => string | number;
}

export type QueryColumnInfoMap = Record<number, QueryColumnInfo>;

export const columnInfoMap: QueryColumnInfoMap = [];

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
  nullable: false,
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
  nullable: false,
  defaultEmWidth: 7,
  columnClass: null,
  getValue: (row: QueryRow) => row.catalogNumber || ''
});
setColumnInfo({
  columnID: QueryColumnID.CollectionStartDate,
  fullName: 'Starting Collection Date',
  abbrName: 'Start Date',
  description: 'First day of collection, which may be the only collection date',
  defaultSelection: true,
  nullable: false, // TODO: Is this true?
  defaultEmWidth: 6,
  columnClass: 'center',
  getValue: (row: QueryRow) => getDateValue(row.collectionStartDate)
});
setColumnInfo({
  columnID: QueryColumnID.CollectionEndDate,
  fullName: 'Ending Collection Date',
  abbrName: 'End Date',
  description: 'Last day of collection, if collected over more than one day',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 6,
  columnClass: 'center',
  getValue: (row: QueryRow) => getDateValue(row.collectionEndDate)
});
setColumnInfo({
  columnID: QueryColumnID.Collectors,
  fullName: 'Collector Names',
  abbrName: 'Collectors',
  description: 'Names of the participating collectors',
  defaultSelection: false,
  nullable: true,
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
  nullable: true,
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
  nullable: true,
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
  nullable: true,
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
  nullable: true,
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
  nullable: true,
  defaultEmWidth: 16,
  columnClass: null,
  getValue: (row: QueryRow) => row.determinationRemarks || ''
});
setColumnInfo({
  columnID: QueryColumnID.TypeStatus,
  fullName: 'Specimen Type Status',
  abbrName: 'Type Status',
  description: 'The type status of this particular specimen',
  defaultSelection: true,
  nullable: true,
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
  nullable: true, // there are no 0s, only nulls
  defaultEmWidth: 4,
  columnClass: 'center',
  getValue: (row: QueryRow) => row.specimenCount || ''
});
setColumnInfo({
  columnID: QueryColumnID.Problems,
  fullName: 'Problems with the Record',
  abbrName: 'Problems',
  description: 'Problems encountered parsing the data record',
  defaultSelection: false,
  nullable: true,
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
  nullable: true,
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
  nullable: true,
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
  nullable: true,
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
  nullable: true,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => row.familyName || ''
});
setColumnInfo({
  columnID: QueryColumnID.Genus,
  fullName: 'Genus',
  abbrName: null,
  description: 'Genus determined for the specimen (with subgenus in parentheses)',
  defaultSelection: false,
  nullable: true,
  defaultEmWidth: 10,
  columnClass: null,
  getValue: (row: QueryRow) => _toItalic(row.genusName)
});
setColumnInfo({
  columnID: QueryColumnID.Species,
  fullName: 'Species',
  abbrName: null,
  description: 'Specific epithet determined for the specimen',
  defaultSelection: false,
  nullable: true,
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
  nullable: true,
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
  nullable: false,
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
  nullable: ['No', 'Yes'],
  defaultEmWidth: 8,
  columnClass: 'center',
  getValue: (row: QueryRow) =>
    row.obligate == CAVE_OBLIGATE_DESIGNATION ? 'Yes' : 'No'
});
setColumnInfo({
  columnID: QueryColumnID.County,
  fullName: 'County',
  abbrName: null,
  description: 'County of Texas in which specimen was found',
  defaultSelection: true,
  nullable: true,
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
  nullable: false,
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
  nullable: true,
  defaultEmWidth: 6,
  columnClass: null,
  getValue: (row: QueryRow) => getNumber(row.publicLatitude)
});
setColumnInfo({
  columnID: QueryColumnID.Longitude,
  fullName: 'Longitude',
  abbrName: null,
  description: 'Longitude of cave at which specimen was found',
  defaultSelection: false,
  nullable: true,
  defaultEmWidth: 6,
  columnClass: null,
  getValue: (row: QueryRow) => getNumber(row.publicLongitude)
});

function _toItalic(name?: string | null) {
  return name ? `<i>${name}</i>` : '';
}
