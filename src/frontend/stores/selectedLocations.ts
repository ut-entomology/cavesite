/**
 * Svelte store tracking the locations that the user has selected.
 */

import type { AxiosInstance } from 'axios';

import { createSessionStore } from '../util/session_store';
import type { LocationSpec } from '../../shared/model';
import { client as clientStore } from '../stores/client';

export type SelectedLocations = Record<string, LocationSpec>;

export const selectedLocations = createSessionStore<SelectedLocations | null>(
  'selected_locations',
  null
);
let selectedLocationsMap: SelectedLocations | null = null;
let client: AxiosInstance;

selectedLocations.subscribe((value) => (selectedLocationsMap = value));
clientStore.subscribe((value) => (client = value));

export async function checkSelectedLocations(): Promise<boolean> {
  if (selectedLocationsMap === null) return true;

  const locations = Object.values(selectedLocationsMap);
  const lastLocationIndex = locations.length - 1;
  let res = await client.post('api/location/pull_list', {
    locationUniques: [locations[0].unique, locations[lastLocationIndex].unique]
  });
  const specs: LocationSpec[] = res.data.locationSpecs;
  return (
    specs.length != 0 ||
    (specs[0].locationID == locations[0].locationID &&
      specs[1].locationID == locations[lastLocationIndex].locationID)
  );
}

export async function updateSelectedLocations(): Promise<void> {
  let res = await client.post('api/location/pull_list', {
    locationUniques: Object.values(selectedLocationsMap!).map((spec) => spec.unique)
  });
  const specs: LocationSpec[] = res.data.locationSpecs;
  const newSelectedLocations: SelectedLocations = {};
  for (const spec of specs) {
    newSelectedLocations[spec.unique] = spec;
  }
  selectedLocations.set(newSelectedLocations);
}
