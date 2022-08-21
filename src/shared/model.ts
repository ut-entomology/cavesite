/**
 * Characterizations of the data models that are generally shared between
 * client and server.
 */

//// General /////////////////////////////////////////////////////////////////

export const MIN_LOOKUP_CHAR_LENGTH = 2;

export const MAX_LOOKUP_MATCHES = 120;

export interface ModelSpec {
  unique: string;
  hasChildren: boolean | null;
}

//// Taxa ////////////////////////////////////////////////////////////////////

export const ROOT_TAXON_UNIQUE = 'Animalia';

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

export enum TaxonRankIndex {
  Kingdom,
  Phylum,
  Class,
  Order,
  Family,
  Genus,
  Species,
  Subspecies
}

export const kingdomPhylumClass = [
  TaxonRank.Kingdom,
  TaxonRank.Phylum,
  TaxonRank.Class
];

export const genusSpeciesSubspecies = [
  TaxonRank.Genus,
  TaxonRank.Species,
  TaxonRank.Subspecies
];

export const italicRanks = [TaxonRank.Genus, TaxonRank.Species, TaxonRank.Subspecies];

export const taxonRanks = Object.values(TaxonRank);

export interface TaxonSpec extends ModelSpec {
  taxonID: number;
  rank: TaxonRank;
  name: string;
  unique: string;
  author: string | null;
  obligate: string | null;
  parentNamePath: string;
  hasChildren: boolean | null; // null => count unknown
}

export interface TaxonPathSpec {
  kingdomName: string;
  phylumName: string | null;
  className: string | null;
  orderName: string | null;
  familyName: string | null;
  genusName: string | null;
  speciesName: string | null;
  subspeciesName: string | null;
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
      obligate: null, // information only available server-side
      parentNamePath,
      hasChildren: true // unknown
    });
    if (parentNamePath != '') parentNamePath += '|';
    parentNamePath += containingName;
  }

  if (fromSpec.unique == '') {
    fromSpec.unique = _nextUniqueName(uniqueName, fromSpec.name);
  }
  return containingSpecs;
}

export function toSpeciesAndSubspecies(
  pathSpec: TaxonPathSpec,
  taxonUnique: string
): [string | null, string | null] {
  const speciesName = pathSpec.speciesName
    ? pathSpec.subspeciesName
      ? taxonUnique.substring(0, taxonUnique.lastIndexOf(' '))
      : taxonUnique
    : null;
  const subspeciesName = pathSpec.subspeciesName ? taxonUnique : null;
  return [speciesName, subspeciesName];
}

function _nextUniqueName(parentUniqueName: string, taxonName: string): string {
  return taxonName[0] == taxonName[0].toUpperCase()
    ? taxonName
    : `${parentUniqueName} ${taxonName}`;
}

//// Location /////////////////////////////////////////////////////////////////

export const ROOT_LOCATION_UNIQUE = 'north america|united states|texas';
export const CAVE_FLAG = 0x01;

export enum LocationRank {
  Continent = 'continent',
  Country = 'country',
  StateProvince = 'state_province',
  County = 'county',
  Locality = 'locality'
}

export enum LocationRankIndex {
  Continent,
  Country,
  StateProvince,
  County,
  Locality
}

export const locationRanks = Object.values(LocationRank);

export const LOCALITY_RANK_INDEX = locationRanks.indexOf(LocationRank.Locality);

export interface LocationSpec extends ModelSpec {
  locationID: number;
  rank: LocationRank;
  name: string;
  unique: string;
  latitude: number | null;
  longitude: number | null;
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
      latitude: null,
      longitude: null,
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

export const MAX_DAYS_TREATED_AS_PER_PERSON = 3;
export const TRAP_DAYS_PER_VISIT = 3;
export const MAX_VISITS_DOCKED = 3;

export enum EffortFlags {
  missingDate = 0x01,
  missingMonth = 0x02,
  missingDayOfMonth = 0x04,
  multiDayPersonVisit = 0x08,
  trap = 0x10
}

export interface RawLocationEffort {
  locationID: number;
  countyName: string | null;
  localityName: string;
  latitude: number | null;
  longitude: number | null;
  flags: EffortFlags;
  perVisitPoints: string;
  perPersonVisitPoints: string;
  visitsByTaxonUnique: Record<string, number>;
  recentTaxa: string | null;
}

export function pointSorter(a: number[], b: number[]) {
  const [ax, bx] = [a[0], b[0]];
  if (ax != bx) return ax - bx;
  const [ay, by] = [a[1], b[1]];
  return ay == by ? 0 : ay - by;
}

//// Cluster /////////////////////////////////////////////////////////////////

export const MAX_ALLOWED_CLUSTERS = 50;
export const PREDICTION_HISTORY_SAMPLE_DEPTH = 3;

export enum DissimilarityBasis {
  // dissimilarity = -1 * no. of taxa the test cave has in common with the mode
  minusCommonTaxa = '- common taxa',
  // dissimilarity = no. of taxa in the test cave but not in the mode
  //  minus no. of taxa the test cave has in common with the mode
  diffMinusCommonTaxa = 'cave diff - common taxa',
  // dissimilarity = no. of taxa in the test cave but not in the mode
  //  plus no. of taxa in the mode but not in the test cave
  //  minus no. of taxa the test cave has in common with the mode
  bothDiffsMinusCommonTaxa = 'both diffs - common taxa',
  // dissimilarity = no. of taxa in the test cave but not in the mode
  diffTaxa = 'cave diff taxa',
  // dissimilarity = no. of taxa in the test cave but not in the mode
  //  plus no. of taxa in the mode but not in the test cave
  bothDiffTaxa = '- both diff taxa'
}

export enum DissimilarityTransform {
  none = 'none',
  ln = 'ln', // natural log
  sqrt = 'sqrt', // square root
  to1_5 = '^1.5'
}

export enum TaxonWeight {
  unweighted = 'unweighted',
  equalWeighted = 'equal weighted',
  halfAgainWeight = '1.5x weight',
  doubleWeight = '2x weight',
  weightTo1_5 = 'weight^1.5',
  squaredWeight = 'weight^2'
}

export interface DissimilarityMetric {
  basis: DissimilarityBasis;
  transform: DissimilarityTransform;
  highestComparedRank: TaxonRank;
  weight: TaxonWeight;
  proximityResolution: boolean;
}

export enum ComparedFauna {
  all = 'all_taxa',
  caveObligates = 'cave_obligates',
  generaHavingCaveObligates = 'cave_genera'
}
export const comparedFauna = Object.values(ComparedFauna);

export interface ClusterSpec {
  metric: DissimilarityMetric;
  comparedFauna?: ComparedFauna;
  minSpecies?: number;
  maxSpecies?: number;
}

export interface TaxaCluster {
  visitsByTaxonUnique: Record<string, number>;
  locationIDs: number[];
}

export function checkComparedFauna(comparedFauna: ComparedFauna | undefined): boolean {
  return comparedFauna === undefined || comparedFauna.includes(comparedFauna);
}

//// Logs ////////////////////////////////////////////////////////////////////

export enum LogType {
  User = 'user',
  Import = 'import',
  Server = 'server'
}

export interface Log {
  id: number;
  timestamp: Date;
  type: LogType;
  tag: string | null;
  line: string;
}
