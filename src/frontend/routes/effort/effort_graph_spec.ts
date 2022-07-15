import type { Point } from '../../../shared/point';
import type { LocationGraphData } from './location_graph_data';

export interface EffortGraphSpec {
  graphTitle: string;
  xAxisLabel: string;
  yAxisLabel: string;
  graphDataSet: LocationGraphData[];
  pointExtractor: (graphData: LocationGraphData) => Point[];
}
