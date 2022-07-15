import type { Point } from '../../../shared/point';
import type { TaxonRank, ComparedTaxa } from '../../../shared/model';
import type { ClientLocationEffort } from './effort_data';
import { type EffortGraphSpec, createEffortGraphSpecPerXUnit } from './effort_graphs';
import { FittedModel } from './fitted_model';
import type { ModelAverager } from './model_averager';

const MIN_POINTS_TO_REGRESS = 3; // strictly min. needed to produce any regression

export interface ClusteringConfig {
  maxClusters: number;
  comparedTaxa: ComparedTaxa;
  ignoreSubgenera: boolean;
  highestComparedRank: TaxonRank;
  minPointsToRegress: number;
  maxPointsToRegress: number;
}

export interface ClusterData {
  locationCount: number;
  visitsByTaxonUnique: Record<string, number>;
}

export interface PerLocationClusterData extends ClusterData {
  perDayTotalsGraphs: SizedEffortGraphSpec;
  perVisitTotalsGraphs: SizedEffortGraphSpec;
  perPersonVisitTotalsGraphs: SizedEffortGraphSpec;
}

export interface SizedEffortGraphSpec {
  pointCount: number;
  graphSpecs: EffortGraphSpec[];
}

export function toPerLocationClusterData(
  visitsByTaxonUnique: Record<string, number>,
  clientEffortSet: ClientLocationEffort[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): PerLocationClusterData {
  let clusterData: PerLocationClusterData = {
    locationCount: clientEffortSet.length,
    visitsByTaxonUnique,
    perDayTotalsGraphs: { pointCount: 0, graphSpecs: [] },
    perVisitTotalsGraphs: { pointCount: 0, graphSpecs: [] },
    perPersonVisitTotalsGraphs: { pointCount: 0, graphSpecs: [] }
  };
  for (const clientEffort of clientEffortSet) {
    const graphSpecPerXUnit = createEffortGraphSpecPerXUnit(
      clientEffort,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    );
    _addGraphSpec(clusterData.perDayTotalsGraphs, graphSpecPerXUnit.perDayTotalsGraph);
    _addGraphSpec(
      clusterData.perVisitTotalsGraphs,
      graphSpecPerXUnit.perVisitTotalsGraph
    );
    _addGraphSpec(
      clusterData.perPersonVisitTotalsGraphs,
      graphSpecPerXUnit.perPersonVisitTotalsGraph
    );
  }
  return clusterData;
}

export function toPerLocationModel(
  sizedGraphSpec: SizedEffortGraphSpec,
  minXAllowingRegression: number,
  modelWeightPower: number
): FittedModel | null {
  const allPoints: Point[] = [];
  let modelAverager: ModelAverager | null = null;
  let lowestX = Infinity;
  let highestX = 0;

  // Loop for each graph spec at one per location in the cluster.

  for (const graphSpec of sizedGraphSpec.graphSpecs) {
    const points = graphSpec.points;
    const lastPoint = points[points.length - 1];
    if (
      points.length >= MIN_POINTS_TO_REGRESS &&
      lastPoint.x >= minXAllowingRegression
    ) {
      const locationModel = new FittedModel(points);
      if (modelAverager == null) {
        modelAverager = locationModel.getModelAverager();
      }
      modelAverager.addModel(graphSpec, locationModel, modelWeightPower);
    }
    if (points.length > 0) {
      allPoints.push(...points);
      if (points[0].x < lowestX) lowestX = points[0].x;
      if (lastPoint.x > highestX) highestX = lastPoint.x;
    }
  }

  // Combine the models if we were able to generate at least one model.

  if (modelAverager === null) return null;
  const averageModel = modelAverager.getAverageModel(lowestX, highestX);
  averageModel.regression.evaluate(allPoints);
  return averageModel;
}

function _addGraphSpec(sizedSpec: SizedEffortGraphSpec, spec: EffortGraphSpec): void {
  sizedSpec.pointCount += spec.points.length;
  sizedSpec.graphSpecs.push(spec);
}
