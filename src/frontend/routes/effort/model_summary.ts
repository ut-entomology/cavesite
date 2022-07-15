import type { FittedModel } from './fitted_model';

export interface ModelSummary {
  modelName: string;
  bestPValue: number;
  averagePValue: number;
  weightedPValue: number;
  bestRMSE: number;
  averageRMSE: number;
  weightedRMSE: number;
  bestR2: number;
  averageR2: number;
  weightedR2: number;
  totalClusters: number;
  totalLocalities: number;
}

export function summarizeModels(
  minCavesAllowed: number,
  minPointsAllowed: number,
  modelsByCluster: FittedModel[][],
  localityCountByCluster: number[]
): ModelSummary[] {
  const summaries: ModelSummary[] = [];
  modelsByCluster[0].forEach((_) =>
    summaries.push({
      modelName: '',
      bestPValue: Infinity,
      averagePValue: 0,
      weightedPValue: 0,
      bestRMSE: Infinity,
      averageRMSE: 0,
      weightedRMSE: 0,
      bestR2: 0,
      averageR2: 0,
      weightedR2: 0,
      totalClusters: 0,
      totalLocalities: 0
    })
  );

  for (let i = 0; i < modelsByCluster.length; ++i) {
    const models = modelsByCluster[i];
    const localityCount = localityCountByCluster[i];

    if (models !== undefined && localityCount >= minCavesAllowed) {
      for (let j = 0; j < models.length; ++j) {
        const model = models[j];
        const regression = model.regression;
        if (regression.residuals.length >= minPointsAllowed) {
          const summary = summaries[j];

          summary.modelName = model.name;

          if (
            !isNaN(regression.jstats.f.pvalue) &&
            !isNaN(regression.rmse) &&
            !isNaN(regression.jstats.R2)
          ) {
            if (regression.jstats.f.pvalue < summary.bestPValue) {
              summary.bestPValue = regression.jstats.f.pvalue;
            }
            summary.averagePValue += regression.jstats.f.pvalue;
            summary.weightedPValue += localityCount * regression.jstats.f.pvalue;

            if (regression.rmse < summary.bestRMSE) {
              summary.bestRMSE = regression.rmse;
            }
            summary.averageRMSE += regression.rmse;
            summary.weightedRMSE += localityCount * regression.rmse;

            if (regression.jstats.R2 > summary.bestR2) {
              summary.bestR2 = regression.jstats.R2;
            }
            summary.averageR2 += regression.jstats.R2;
            summary.weightedR2 += localityCount * regression.jstats.R2;

            summary.totalClusters += 1;
            summary.totalLocalities += localityCount;
          }
        }
      }
    }
  }

  for (const summary of summaries) {
    summary.averagePValue /= summary.totalClusters;
    summary.averageRMSE /= summary.totalClusters;
    summary.averageR2 /= summary.totalClusters;

    summary.weightedPValue /= summary.totalLocalities;
    summary.weightedRMSE /= summary.totalLocalities;
    summary.weightedR2 /= summary.totalLocalities;
  }

  return summaries;
}
