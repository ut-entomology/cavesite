import { createSessionStore } from '../util/session_store';
import type { TaxonSpec } from '../../shared/model';

export type SelectedTaxa = Record<string, TaxonSpec>;

export const selectedTaxa = createSessionStore<SelectedTaxa | null>(
  'selected_taxa',
  null
);
