import { createSessionStore } from '../util/session_store';
import type { LocationSpec } from '../../shared/model';

export type SelectedLocations = Record<string, LocationSpec>;

export const selectedLocations = createSessionStore<SelectedLocations | null>(
  'selected_locations',
  null
);
