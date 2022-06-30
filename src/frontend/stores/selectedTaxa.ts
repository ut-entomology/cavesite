import type { AxiosInstance } from 'axios';

import { createSessionStore } from '../util/session_store';
import type { TaxonSpec } from '../../shared/model';
import { client as clientStore } from '../stores/client';

export type SelectedTaxa = Record<string, TaxonSpec>;

export const selectedTaxa = createSessionStore<SelectedTaxa | null>(
  'selected_taxa',
  null
);
let selectedTaxaMap: SelectedTaxa | null = null;
let client: AxiosInstance;

selectedTaxa.subscribe((value) => (selectedTaxaMap = value));
clientStore.subscribe((value) => (client = value));

export async function checkSelectedTaxa(): Promise<boolean> {
  if (selectedTaxaMap === null) return true;

  const taxa = Object.values(selectedTaxaMap);
  const lastTaxonIndex = taxa.length - 1;
  let res = await client.post('api/taxa/get_list', {
    taxonUniques: [taxa[0].unique, taxa[lastTaxonIndex].unique]
  });
  const specs: TaxonSpec[] = res.data.taxonSpecs;
  return (
    specs.length != 0 ||
    (specs[0].taxonID == taxa[0].taxonID &&
      specs[1].taxonID == taxa[lastTaxonIndex].taxonID)
  );
}

export async function updateSelectedTaxa(): Promise<void> {
  let res = await client.post('api/taxa/get_list', {
    taxonUniques: Object.values(selectedTaxaMap!).map((spec) => spec.unique)
  });
  const specs: TaxonSpec[] = res.data.taxonSpecs;
  const newSelectedTaxa: SelectedTaxa = {};
  for (const spec of specs) {
    newSelectedTaxa[spec.unique] = spec;
  }
  selectedTaxa.set(newSelectedTaxa);
}
