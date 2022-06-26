import type { EffortData } from './effort_data';
import {
  type YAxisType,
  type MultiEffortGraphSpec,
  createMultiEffortGraphSpec
} from '../lib/effort_graphs';

export interface JumbledClusterData {
  locationCount: number;
  multiSpec: MultiEffortGraphSpec;
}

export function toJumbledJumbledClusterData(
  yAxisType: YAxisType,
  effortDataSet: EffortData[],
  lowerBoundX: number,
  upperBoundX: number,
  minUnchangedY: number,
  zeroYBaseline: boolean
): JumbledClusterData {
  let clusterMultiSpec: MultiEffortGraphSpec | null = null;
  for (const effortData of effortDataSet) {
    const multiSpec = createMultiEffortGraphSpec(
      yAxisType,
      effortData,
      lowerBoundX,
      upperBoundX,
      minUnchangedY,
      zeroYBaseline
    );
    if (!clusterMultiSpec) {
      clusterMultiSpec = multiSpec;
    } else {
      clusterMultiSpec.perDayTotalsGraph.points.push(
        ...multiSpec.perDayTotalsGraph.points
      );
      clusterMultiSpec.perVisitTotalsGraph.points.push(
        ...multiSpec.perVisitTotalsGraph.points
      );
      clusterMultiSpec.perPersonVisitTotalsGraph.points.push(
        ...multiSpec.perPersonVisitTotalsGraph.points
      );
    }
  }
  return {
    locationCount: effortDataSet.length,
    multiSpec: clusterMultiSpec!
  };
}
