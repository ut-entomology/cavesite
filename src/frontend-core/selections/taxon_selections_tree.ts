import { SelectionsTree } from './selections_tree';
import { TaxonSpec, createContainingTaxonSpecs } from '../../shared/model';

export class TaxonSelectionsTree extends SelectionsTree<TaxonSpec> {
  constructor(specs: TaxonSpec[]) {
    super(specs);
  }

  getContainingSpecs(forSpec: TaxonSpec): TaxonSpec[] {
    return createContainingTaxonSpecs(forSpec);
  }
}
