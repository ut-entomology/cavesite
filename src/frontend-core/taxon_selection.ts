import { SelectionsTree } from './selections_tree';
import { TaxonSpec, createTaxonSpecs } from '../shared/taxa';

export class TaxonSelectionTree extends SelectionsTree<TaxonSpec> {
  constructor(specs: TaxonSpec[]) {
    super(specs);
  }

  createContainingSpecs(forSpec: TaxonSpec): TaxonSpec[] {
    return createTaxonSpecs(forSpec);
  }
}
