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

export const taxonRanks = [
  TaxonRank.Kingdom,
  TaxonRank.Phylum,
  TaxonRank.Class,
  TaxonRank.Order,
  TaxonRank.Family,
  TaxonRank.Genus,
  TaxonRank.Species,
  TaxonRank.Subspecies
];

export interface TaxonSpec {
  // excludes ID because IDs change with each GBIF import
  rank: TaxonRank;
  name: string;
  unique: string;
  author: string | null;
  containingNames: string;
  childCount: number | null; // null => count unknown
}

export function createTaxonSpecs(fromSpec: TaxonSpec): TaxonSpec[] {
  const containingSpecs: TaxonSpec[] = [];
  let containingNamesList: string[] = [];
  if (fromSpec.containingNames != '') {
    containingNamesList = fromSpec.containingNames?.split('|');
  }
  let containingNames = '';
  let uniqueName = '';

  for (let i = 0; i < containingNamesList.length; ++i) {
    const containingName = containingNamesList[i];
    uniqueName = _nextUniqueName(uniqueName, containingName);
    containingSpecs.push({
      rank: taxonRanks[i],
      name: containingName,
      unique: uniqueName,
      author: null,
      containingNames,
      childCount: null
    });
    if (containingNames == '') {
      containingNames = containingName; // necessarily kingdom
    } else {
      containingNames += '|' + containingName;
    }
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
