//// Taxa ////////////////////////////////////////////////////////////////////

export const ROOT_TAXON = 'Animalia';

export enum TaxonRank {
  Kingdom = 'kingdom',
  Phylum = 'phylum',
  Class = 'class',
  Order = 'order',
  Family = 'family',
  Genus = 'genus',
  Species = 'species',
  Subspecies = 'subspecies'
}

export const taxonRanks = Object.values(TaxonRank);

export interface TaxonSpec {
  taxonID: number;
  rank: TaxonRank;
  name: string;
  unique: string;
  author: string | null;
  parentNamePath: string;
  hasChildren: boolean | null; // null => count unknown
}

export interface TaxonFilter {
  phylumIDs: number[] | null;
  classIDs: number[] | null;
  orderIDs: number[] | null;
  familyIDs: number[] | null;
  genusIDs: number[] | null;
  speciesIDs: number[] | null;
}

export function createContainingTaxonSpecs(fromSpec: TaxonSpec): TaxonSpec[] {
  const containingSpecs: TaxonSpec[] = [];
  let containingNames: string[] = [];
  if (fromSpec.parentNamePath != '') {
    containingNames = fromSpec.parentNamePath?.split('|');
  }
  let parentNamePath = '';
  let uniqueName = '';

  for (let i = 0; i < containingNames.length; ++i) {
    const containingName = containingNames[i];
    uniqueName = _nextUniqueName(uniqueName, containingName);
    containingSpecs.push({
      taxonID: 0, // initial, unsaved value
      rank: taxonRanks[i],
      name: containingName,
      unique: uniqueName,
      author: null,
      parentNamePath,
      hasChildren: true
    });
    if (parentNamePath != '') parentNamePath += '|';
    parentNamePath += containingName;
  }

  if (fromSpec.unique == '') {
    fromSpec.unique = _nextUniqueName(uniqueName, fromSpec.name);
  }
  return containingSpecs;
}

function _nextUniqueName(parentUniqueName: string, taxonName: string): string {
  return taxonName[0] == taxonName[0].toUpperCase()
    ? taxonName
    : `${parentUniqueName} ${taxonName}`;
}

//// Location /////////////////////////////////////////////////////////////////

export enum LocationRank {
  Continent = 'continent',
  Country = 'country',
  StateProvince = 'state_province',
  County = 'county',
  Locality = 'locality'
}

export const locationRanks = Object.values(LocationRank);

export const LOCALITY_RANK_INDEX = locationRanks.indexOf(LocationRank.Locality);

export interface LocationSpec {
  locationID: number;
  rank: LocationRank;
  name: string;
  guid: string | null;
  publicLatitude: number | null;
  publicLongitude: number | null;
  parentNamePath: string;
}

export function createContainingLocationSpecs(fromSpec: LocationSpec): LocationSpec[] {
  const containingSpecs: LocationSpec[] = [];
  let containingNames: string[] = [];
  if (fromSpec.parentNamePath != '') {
    containingNames = fromSpec.parentNamePath?.split('|');
  }
  let parentNamePath = '';

  for (let i = 0; i < containingNames.length; ++i) {
    const containingName = containingNames[i];
    containingSpecs.push({
      locationID: 0,
      rank: locationRanks[i],
      name: containingName,
      guid: null, // not needed above locality
      publicLatitude: null,
      publicLongitude: null,
      parentNamePath
    });
    if (parentNamePath != '') parentNamePath += '|';
    parentNamePath += containingName;
  }
  return containingSpecs;
}

//// Records /////////////////////////////////////////////////////////////////

export enum SortColumn {
  CatalogNumber,
  Phylum,
  Class,
  Order,
  Family,
  Genus,
  Species,
  Subspecies,
  County,
  Locality,
  StartDate,
  EndDate,
  TypeStatus,
  SpecimenCount
}

export interface ColumnSort {
  column: SortColumn;
  ascending: boolean;
}

/**
 * Records are query results, which are subsets of the specimens table.
 * All columns are optional, but columns that must occur in groups are
 * grouped together in the list below. This allows queries to return the
 * distinct sets without repeating entries, providing query flexibility.
 */
export interface ResultRecord {
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

//// Effort //////////////////////////////////////////////////////////////////

export interface EffortResult {
  locationID: number;
  startDate: Date;
  endDate: Date;
  perVisitPoints: string;
  perPersonVisitPoints: string;
}

export function pointSorter(a: number[], b: number[]) {
  const [ax, bx] = [a[0], b[0]];
  if (ax != bx) return ax - bx;
  const [ay, by] = [a[1], b[1]];
  return ay == by ? 0 : ay - by;
}

//// Cluster /////////////////////////////////////////////////////////////////

export enum SeedType {
  random, // seed locations are randomly selected
  sized, // seed locations are distributed in size
  diverse // seed locations are maximally diverse
}

export interface SeedSpec {
  seedType: SeedType;
  maxClusters: number;
  minSpecies: number;
  maxSpecies: number;
}
