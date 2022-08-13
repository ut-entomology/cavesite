/**
 * LocationSelectionsTree represents a tree of selected locations.
 */

import { SelectionsTree } from './selections_tree';
import { LocationSpec, createContainingLocationSpecs } from '../../shared/model';

export class LocationSelectionsTree extends SelectionsTree<LocationSpec> {
  constructor(specs: LocationSpec[]) {
    super(specs);
  }

  getContainingSpecs(forSpec: LocationSpec): LocationSpec[] {
    return createContainingLocationSpecs(forSpec);
  }
}
