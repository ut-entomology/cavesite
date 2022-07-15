import type { Point } from '../../../shared/point';
import type { TaxonRank, ComparedTaxa } from '../../../shared/model';
import type { ClientLocationEffort } from './client_location_effort';
import { type GraphPointSet, createEffortGraphSpecPerXUnit } from './effort_graphs';
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
  perDayTotalsPointSets: MultiGraphPointSet;
  perVisitTotalsPointSets: MultiGraphPointSet;
  perPersonVisitTotalsPointSets: MultiGraphPointSet;
}

export interface MultiGraphPointSet {
  pointCount: number;
  pointSets: GraphPointSet[];
}

export function toClusterData(
  visitsByTaxonUnique: Record<string, number>,
  clientEffortSet: ClientLocationEffort[],
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): ClusterData {
  let clusterData: ClusterData = {
    locationCount: clientEffortSet.length,
    visitsByTaxonUnique,
    perDayTotalsPointSets: { pointCount: 0, pointSets: [] },
    perVisitTotalsPointSets: { pointCount: 0, pointSets: [] },
    perPersonVisitTotalsPointSets: { pointCount: 0, pointSets: [] }
  };
  for (const clientEffort of clientEffortSet) {
    const pointSetPerXUnit = createEffortGraphSpecPerXUnit(
      clientEffort,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    );
    _addGraphSpec(
      clusterData.perDayTotalsPointSets,
      pointSetPerXUnit.perDayTotalsGraph
    );
    _addGraphSpec(
      clusterData.perVisitTotalsPointSets,
      pointSetPerXUnit.perVisitTotalsGraph
    );
    _addGraphSpec(
      clusterData.perPersonVisitTotalsPointSets,
      pointSetPerXUnit.perPersonVisitTotalsGraph
    );
  }
  return clusterData;
}

export function toFittedModel(
  sizedGraphSpec: MultiGraphPointSet,
  minXAllowingRegression: number,
  modelWeightPower: number
): FittedModel | null {
  const allPoints: Point[] = [];
  let modelAverager: ModelAverager | null = null;
  let lowestX = Infinity;
  let highestX = 0;

  // Loop for each graph spec at one per location in the cluster.

  for (const pointSet of sizedGraphSpec.pointSets) {
    const points = pointSet.points;
    const lastPoint = points[points.length - 1];
    if (
      points.length >= MIN_POINTS_TO_REGRESS &&
      lastPoint.x >= minXAllowingRegression
    ) {
      const locationModel = new FittedModel(points);
      if (modelAverager == null) {
        modelAverager = locationModel.getModelAverager();
      }
      modelAverager.addModel(pointSet, locationModel, modelWeightPower);
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

function _addGraphSpec(sizedSpec: MultiGraphPointSet, spec: GraphPointSet): void {
  sizedSpec.pointCount += spec.points.length;
  sizedSpec.pointSets.push(spec);
}
