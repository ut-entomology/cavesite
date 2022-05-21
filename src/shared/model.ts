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

//// Specimen /////////////////////////////////////////////////////////////////

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
  Latitude,
  Longitude,
  StartDate,
  EndDate,
  TypeStatus,
  SpecimenCount
}

export interface ColumnSort {
  column: SortColumn;
  ascending: boolean;
}

export interface SpecimenSpec {
  catalogNumber: string;
  occurrenceGuid: string; // GBIF occurrenceID (specify co.GUID)
  taxonRank: TaxonRank;
  taxonUnique: string;
  taxonAuthor: string | null;
  phylumName: string | null;
  className: string | null;
  orderName: string | null;
  familyName: string | null;
  genusName: string | null;
  speciesName: string | null;
  countyName: string | null;
  localityName: string;
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
}
