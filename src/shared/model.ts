//// General /////////////////////////////////////////////////////////////////

export const MIN_LOOKUP_CHAR_LENGTH = 2;

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
  unique: string;
  publicLatitude: number | null;
  publicLongitude: number | null;
  parentNamePath: string;
  hasChildren: boolean | null;
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
      unique: toLocationUnique(parentNamePath, containingName),
      publicLatitude: null,
      publicLongitude: null,
      parentNamePath,
      hasChildren: true
    });
    if (parentNamePath != '') parentNamePath += '|';
    parentNamePath += containingName;
  }
  return containingSpecs;
}

/**
 * Creates a unique identifier for a location based on its name and the names of
 * the locations that contain it. The unique is a concatenation of the three most
 * specific names available for the location, or fewer names if fewer are available.
 * It uses lowercase with punctuation and duplicate spaces removed in an attempt to
 * survive at least some edits made to the names. GUIDs are not used because each
 * Specify installation creates its own for each locality, potentially giving the
 * same location multiple GUIDs and preventing their correlation, should the website
 * ever draw from additional data sources.
 */
export function toLocationUnique(parentNamePath: string, locationName: string): string {
  const names = parentNamePath == '' ? [] : parentNamePath.split('|');
  names.push(locationName);
  while (names.length > 3) names.shift();
  return names
    .join('|')
    .replace(PUNCT_REGEX, '')
    .replace(/\s{2,}/g, ' ')
    .toLowerCase();
}
const PUNCT_REGEX = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{}~]/g;

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

export interface DissimilarityMetric {
  basis: DissimilarityBasis;
  transform: DissimilarityTransform;
  weight: TaxonWeight;
}

export enum DissimilarityBasis {
  // dissimilarity = -1 * no. of taxa the test cave has in common with the mode
  minusCommonTaxa = 'minus common taxa',
  // dissimilarity = no. of taxa in the test cave but not in the mode
  //  minus no. of taxa the test cave has in common with the mode
  diffMinusCommonTaxa = 'test diff minus common taxa',
  // dissimilarity = no. of taxa in the test cave but not in the mode
  //  plus no. of taxa in the mode but not in the test cave
  //  minus no. of taxa the test cave has in common with the mode
  bothDiffsMinusCommonTaxa = 'both diffs minus common taxa',
  // dissimilarity = no. of taxa in the test cave but not in the mode
  diffTaxa = 'test diff taxa',
  // dissimilarity = no. of taxa in the test cave but not in the mode
  //  plus no. of taxa in the mode but not in the test cave
  bothDiffTaxa = 'minus both diff taxa'
}

export enum DissimilarityTransform {
  none = 'none',
  ln = 'ln', // natural log
  sqrt = 'sqrt', // square root
  to1_5 = '^1.5'
}

export enum TaxonWeight {
  unweighted = 'unweighted',
  weighted = 'weighted',
  halfAgainWeight = '1.5x weight',
  doubleWeight = '2x weight',
  onlySpecies = 'only species',
  onlyGenera = 'only genera',
  onlyGeneraAndSpecies = 'only genera + species'
}

export interface ClusterSpec {
  metric: DissimilarityMetric;
  minSpecies?: number;
  maxSpecies?: number;
}
