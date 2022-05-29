import { QueryColumnID } from '../../shared/user_query';

export interface QueryColumnInfo {
  columnID: QueryColumnID;
  fullName: string; // name to display for column when configuring filter
  abbrName: string | null; // name to display for column in column header
  description: string; // information about the column
  defaultSelection: boolean; // whether query requests the column by default
  nullable: boolean; // whether column can be null
  defaultEmWidth: number; // default width of the column in em
}

export type QueryColumnInfoMap = Record<number, QueryColumnInfo>;

export const columnInfoMap: QueryColumnInfoMap = [];

const setColumnInfo = (columnInfo: QueryColumnInfo) => {
  columnInfoMap[columnInfo.columnID] = columnInfo;
};
setColumnInfo({
  columnID: QueryColumnID.ResultCount,
  fullName: 'Result Count',
  abbrName: 'Results',
  description: 'Number of results in the data that are identical to the given result.',
  defaultSelection: true,
  nullable: false,
  defaultEmWidth: 5
});
setColumnInfo({
  columnID: QueryColumnID.CatalogNumber,
  fullName: 'Catalog Number',
  abbrName: 'Catalog No.',
  description: "Catalog number of the specimen(s) in UT Austin's Specify database.",
  defaultSelection: true,
  nullable: false,
  defaultEmWidth: 8
});
setColumnInfo({
  columnID: QueryColumnID.CollectionStartDate,
  fullName: 'Starting Collection Date',
  abbrName: 'Start Date',
  description: 'First day of collection, which may be the only collection date',
  defaultSelection: true,
  nullable: false, // TODO: Is this true?
  defaultEmWidth: 8
});
setColumnInfo({
  columnID: QueryColumnID.CollectionEndDate,
  fullName: 'Ending Collection Date',
  abbrName: 'End Date',
  description: 'Last day of collection, if collected over more than one day',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 8
});
setColumnInfo({
  columnID: QueryColumnID.Collectors,
  fullName: 'Collector Names',
  abbrName: 'Collectors',
  description: 'Names of the participating collectors',
  defaultSelection: false,
  nullable: true,
  defaultEmWidth: 16
});
setColumnInfo({
  columnID: QueryColumnID.Determiners,
  fullName: 'Determiner Names',
  abbrName: 'Determiners',
  description: 'Names of the determiners',
  defaultSelection: false,
  nullable: true,
  defaultEmWidth: 8
});
setColumnInfo({
  columnID: QueryColumnID.DeterminationYear,
  fullName: 'Determination Year',
  abbrName: 'Det. Year',
  description: 'Names of the determiners',
  defaultSelection: false,
  nullable: true,
  defaultEmWidth: 8
});
setColumnInfo({
  columnID: QueryColumnID.CollectionRemarks,
  fullName: 'Collection Remarks',
  abbrName: null,
  description: 'Remarks about the collecting trip and habitat',
  defaultSelection: false,
  nullable: true,
  defaultEmWidth: 16
});
setColumnInfo({
  columnID: QueryColumnID.OccurrenceRemarks,
  fullName: 'Occurrence Remarks',
  abbrName: null,
  description: 'Remarks about the specimens collected',
  defaultSelection: false,
  nullable: true,
  defaultEmWidth: 16
});
setColumnInfo({
  columnID: QueryColumnID.DeterminationRemarks,
  fullName: 'Determination Remarks',
  abbrName: 'Det. Remarks',
  description: 'Remarks about the determination',
  defaultSelection: false,
  nullable: true,
  defaultEmWidth: 16
});
setColumnInfo({
  columnID: QueryColumnID.TypeStatus,
  fullName: 'Specimen Type Status',
  abbrName: 'Type Status',
  description: 'The type status of this particular specimen',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 8
});
setColumnInfo({
  columnID: QueryColumnID.SpecimenCount,
  fullName: 'Specimen Count',
  abbrName: 'Count',
  description: 'The number of specimens collected',
  defaultSelection: true,
  nullable: true, // TODO: Might want to treat 0s as nulls, if not already
  defaultEmWidth: 4
});
setColumnInfo({
  columnID: QueryColumnID.Problems,
  fullName: 'Problems with the Record',
  abbrName: 'Problems',
  description: 'Problems encountered parsing the data record',
  defaultSelection: false,
  nullable: false,
  defaultEmWidth: 20
});
setColumnInfo({
  columnID: QueryColumnID.Phylum,
  fullName: 'Phylum',
  abbrName: null,
  description: 'Phylum determined for the specimen',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 10
});
setColumnInfo({
  columnID: QueryColumnID.Class,
  fullName: 'Class',
  abbrName: null,
  description: 'Class determined for the specimen',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 10
});
setColumnInfo({
  columnID: QueryColumnID.Order,
  fullName: 'Order',
  abbrName: null,
  description: 'Order determined for the specimen',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 10
});
setColumnInfo({
  columnID: QueryColumnID.Family,
  fullName: 'Family',
  abbrName: null,
  description: 'Family determined for the specimen',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 10
});
setColumnInfo({
  columnID: QueryColumnID.Genus,
  fullName: 'Genus',
  abbrName: null,
  description: 'Genus determined for the specimen',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 10
});
setColumnInfo({
  columnID: QueryColumnID.Species,
  fullName: 'Species',
  abbrName: null,
  description: 'Specific epithet determined for the specimen',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 10
});
setColumnInfo({
  columnID: QueryColumnID.Subspecies,
  fullName: 'Subspecies',
  abbrName: null,
  description: 'Infraspecific epithet determined for the specimen',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 10
});
setColumnInfo({
  columnID: QueryColumnID.County,
  fullName: 'County',
  abbrName: null,
  description: 'County of Texas in which specimen was found',
  defaultSelection: true,
  nullable: true,
  defaultEmWidth: 16
});
setColumnInfo({
  columnID: QueryColumnID.Locality,
  fullName: 'Locality',
  abbrName: null,
  description: 'Locality within county where specimen was found',
  defaultSelection: true,
  nullable: false,
  defaultEmWidth: 20
});
setColumnInfo({
  columnID: QueryColumnID.Latitude,
  fullName: 'Latitude',
  abbrName: null,
  description: 'Latitude of cave at which specimen was found',
  defaultSelection: false,
  nullable: true,
  defaultEmWidth: 6
});
setColumnInfo({
  columnID: QueryColumnID.Longitude,
  fullName: 'Longitude',
  abbrName: null,
  description: 'Longitude of cave at which specimen was found',
  defaultSelection: false,
  nullable: true,
  defaultEmWidth: 6
});
