<script lang="ts" context="module">
  import { createSessionStore } from '../util/session_store';
  import type { TaxonSpec } from '../../shared/taxa';

  export type SelectedTaxa = Record<string, TaxonSpec>;

  export const selectedTaxa = createSessionStore<SelectedTaxa | null>(
    'selected_taxa',
    null
  );
</script>
