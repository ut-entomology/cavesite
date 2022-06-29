import { TaxonRank } from '../../shared/model';
import { LocationRank } from '../../shared/model';
import type { QueryLocationFilter, QueryTaxonFilter } from '../../shared/general_query';
import type { SelectedTaxa } from '../stores/selectedTaxa';
import type { SelectedLocations } from '../stores/selectedLocations';

export function getLocationFilter(
  selectedLocations: SelectedLocations | null
): QueryLocationFilter | null {
  if (selectedLocations === null) return null;

  const filter: QueryLocationFilter = {
    countyIDs: null,
    localityIDs: null
  };
  for (const spec of Object.values(selectedLocations)) {
    switch (spec.rank) {
      case LocationRank.County:
        filter.countyIDs = appendFilteredID(filter.countyIDs, spec.locationID);
        break;
      case LocationRank.Locality:
        filter.localityIDs = appendFilteredID(filter.localityIDs, spec.locationID);
        break;
    }
  }
  return filter;
}

export function getTaxonFilter(
  selectedTaxa: SelectedTaxa | null
): QueryTaxonFilter | null {
  if (selectedTaxa === null) return null;

  const filter: QueryTaxonFilter = {
    phylumIDs: null,
    classIDs: null,
    orderIDs: null,
    familyIDs: null,
    genusIDs: null,
    speciesIDs: null,
    subspeciesIDs: null
  };
  for (const spec of Object.values(selectedTaxa)) {
    switch (spec.rank) {
      case TaxonRank.Phylum:
        filter.phylumIDs = appendFilteredID(filter.phylumIDs, spec.taxonID);
        break;
      case TaxonRank.Class:
        filter.classIDs = appendFilteredID(filter.classIDs, spec.taxonID);
        break;
      case TaxonRank.Order:
        filter.orderIDs = appendFilteredID(filter.orderIDs, spec.taxonID);
        break;
      case TaxonRank.Family:
        filter.familyIDs = appendFilteredID(filter.familyIDs, spec.taxonID);
        break;
      case TaxonRank.Genus:
        filter.genusIDs = appendFilteredID(filter.genusIDs, spec.taxonID);
        break;
      case TaxonRank.Species:
        filter.speciesIDs = appendFilteredID(filter.speciesIDs, spec.taxonID);
        break;
      case TaxonRank.Subspecies:
        filter.subspeciesIDs = appendFilteredID(filter.subspeciesIDs, spec.taxonID);
        break;
    }
  }
  return filter;
}

function appendFilteredID(toList: number[] | null, taxonID: number): number[] {
  if (toList === null) return [taxonID];
  toList.push(taxonID);
  return toList;
}
