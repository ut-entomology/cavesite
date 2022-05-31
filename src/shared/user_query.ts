/**
 * Support for conveying general queries and query results between client and server
 */

export enum QueryColumnID {
  ResultCount,
  CatalogNumber,
  CollectionStartDate,
  CollectionEndDate,
  Collectors,
  Determiners,
  DeterminationYear,
  CollectionRemarks,
  OccurrenceRemarks,
  DeterminationRemarks,
  TypeStatus,
  SpecimenCount,
  Problems,
  Phylum,
  Class,
  Order,
  Family,
  Genus,
  Species,
  Subspecies,
  County,
  Locality,
  Latitude,
  Longitude,
  _LENGTH
}

export interface QueryColumnSpec {
  columnID: QueryColumnID;
  ascending: boolean | null; // null => not sorted
  nullValues: boolean | null; // null => null or not
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

  collectionEndDate?: Date | null;

  collectors?: string | null; // |-delimited names, last name last

  determinationYear?: number | null;

  determiners?: string | null; // |-delimited names, last name last

  collectionRemarks?: string | null;

  occurrenceRemarks?: string | null;

  determinationRemarks?: string | null;

  typeStatus?: string | null;

  specimenCount?: number | null;

  problems?: string | null;

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

  speciesName?: string | null;
  speciesID?: number | null;

  subspeciesName?: string | null;
  subspeciesID?: number | null;

  taxonAuthor?: string | null; // occurs when any taxon rank occurs

  countyName?: string | null;
  countyID?: number | null;

  localityName?: string | null;
  localityID?: number | null;

  publicLatitude?: number | null;
  publicLongitude?: number | null;
}
