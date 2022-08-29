import { createSessionStore } from '../util/session_store';
import type { GeneralQuery, QueryRow } from '../../shared/general_query';

export interface CachedResults {
  version: number;
  query: GeneralQuery;
  startOffset: number;
  totalRows: number;
  rows: QueryRow[];
}

export const cachedResults = createSessionStore<CachedResults | null>(
  'cached_results',
  null
);
