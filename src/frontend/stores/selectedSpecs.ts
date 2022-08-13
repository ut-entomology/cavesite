/**
 * Svelte store for generically communicating location and taxa selections
 * to their respective browser dialoags.
 */

import type { createSessionStore } from '../util/session_store';
import type { ModelSpec } from '../../shared/model';

export type SelectedSpecs = Record<string, ModelSpec>;
export type SelectedSpecsStore = ReturnType<
  typeof createSessionStore<SelectedSpecs | null>
>;
