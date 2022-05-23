import { createSessionStore } from '../util/session_store';
import type { EffortPoints } from '../../shared/model';

export const effortPoints = createSessionStore<EffortPoints | null>(
  'effort_points',
  null
);
