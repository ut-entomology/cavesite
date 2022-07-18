import type { Point } from '../../../shared/point';
import type { ClusteringConfig } from '../../../frontend-core/clusters/cluster_data';
import type { EffortGraphSpec } from '../../../frontend-core/clusters/effort_graph_spec';
import type { LocationGraphData } from '../../../frontend-core/clusters/location_graph_data';

export enum DatasetType {
  visits = 'per-visit-set',
  personVisits = 'per-person-visit-set'
}

export function getGraphSpec(
  config: ClusteringConfig,
  datasetType: DatasetType,
  forModel: boolean
): EffortGraphSpec {
  // datasetType is passed in to get reactivity in the HTML

  let graphTitle: string;
  let xAxisLabel: string;
  let maxPointCount = Infinity;
  let pointExtractor: (graphData: LocationGraphData) => Point[];

  if (datasetType == DatasetType.visits) {
    if (forModel) {
      graphTitle = 'Avg. model of cumulative species across visits';
      xAxisLabel = 'visits in regressed range';
      maxPointCount = config.maxPointsToRegress || Infinity;
    } else {
      graphTitle = 'Cumulative species across visits';
      xAxisLabel = 'visits';
    }
    pointExtractor = (graphData) => graphData.perVisitPoints;
  } else {
    if (forModel) {
      graphTitle = 'Avg. model of cumulative species across person-visits';
      xAxisLabel = 'person-visits in regressed range';
      maxPointCount = config.maxPointsToRegress || Infinity;
    } else {
      graphTitle = 'Cumulative species across person-visits';
      xAxisLabel = 'person-visits';
    }
    pointExtractor = (graphData) => graphData.perPersonVisitPoints;
  }
  return {
    graphTitle,
    xAxisLabel,
    pointSliceSpec: {
      minPointCount: 0,
      maxPointCount,
      recentPointsToIgnore: 0
    },
    pointExtractor
  };
}
