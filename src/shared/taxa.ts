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

export interface TaxonInfo {
  // excludes ID because IDs change with each GBIF import
  rank: TaxonRank;
  name: string;
  unique: string;
  author: string | null;
  ancestors: string | null;
}

export function nextUniqueName(parentUniqueName: string, taxonName: string): string {
  return taxonName[0] == taxonName[0].toUpperCase()
    ? taxonName
    : `${parentUniqueName} ${taxonName}`;
}
