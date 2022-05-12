import { SelectionsTree } from './selections_tree';
import { TaxonSpec, createTaxonSpecs } from '../shared/taxa';

export class TaxonSelectionsTree extends SelectionsTree<TaxonSpec> {
  constructor(specs: TaxonSpec[]) {
    super(specs);
  }

  getContainingSpecs(forSpec: TaxonSpec): TaxonSpec[] {
    return createTaxonSpecs(forSpec);
  }
}
