//// Taxa ////////////////////////////////////////////////////////////////////

export const ROOT_TAXON = 'Animalia';

export const MIN_PARTIAL_TAXON_LENGTH = 2;

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

export const italicRanks = [TaxonRank.Genus, TaxonRank.Species, TaxonRank.Subspecies];

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

export interface SimilarityMetric {
  basis: SimilarityBasis;
  transform: SimilarityTransform;
  weight: TaxonWeight | null;
}

export enum SimilarityBasis {
  // similarity = abs(no. taxa in test cave minus no. taxa in mode)
  taxonCount = 'taxon count',
  // similarity = no. of taxa the test cave has in common with the mode
  commonTaxa = 'common taxa',
  // similarity = no. of taxa the test cave has in common with the mode
  //  minus no. of taxa in the test cave but not in the mode
  commonMinusDiffTaxa = 'common taxa minus diffs',
  // similarity = no. of taxa the test cave has in common with the mode
  //  minus no. of taxa in the test cave but not in the mode
  //  minus no. of taxa in the mode but not in the test cave
  commonMinusBothDiffTaxa = 'common taxa minus both diffs',
  // similarity = no. of taxa in the test cave but not in the mode
  minusDiffTaxa = 'minus diff taxa',
  // similarity = -1 * (no. of taxa in the test cave but not in the mode
  //  plus no. of taxa in the mode but not in the test cave)
  minusbothDiffTaxa = 'minus both diff taxa'
}

export enum SimilarityTransform {
  none = 'none',
  ln = 'ln', // natural log
  sqrt = 'sqrt', // square root
  to1_5 = 'to 1.5 power'
}

export enum TaxonWeight {
  weighted = 'weighted',
  unweighted = 'unweighted',
  doubleWeight = 'doubleWeight'
}

export interface SeedSpec {
  similarityMetric: SimilarityMetric;
  maxClusters: number;
  minSpecies: number;
  maxSpecies: number;
}
