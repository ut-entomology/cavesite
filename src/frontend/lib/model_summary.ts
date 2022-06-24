import type { PlottableModel } from './linear_regression';

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
  modelsByCluster: PlottableModel[][],
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

  for (const models of modelsByCluster) {
    if (models !== undefined) {
      for (let i = 0; i < models.length; ++i) {
        const localityCount = localityCountByCluster[i];
        const model = models[i];
        const summary = summaries[i];

        summary.modelName = model.name;

        if (
          !isNaN(model.jstats.f.pvalue) &&
          !isNaN(model.rmse) &&
          !isNaN(model.jstats.R2)
        ) {
          if (model.jstats.f.pvalue < summary.bestPValue) {
            summary.bestPValue = model.jstats.f.pvalue;
          }
          summary.averagePValue += model.jstats.f.pvalue;
          summary.weightedPValue += localityCount * model.jstats.f.pvalue;

          if (model.rmse < summary.bestRMSE) {
            summary.bestRMSE = model.rmse;
          }
          summary.averageRMSE += model.rmse;
          summary.weightedRMSE += localityCount * model.rmse;

          if (model.jstats.R2 > summary.bestR2) {
            summary.bestR2 = model.jstats.R2;
          }
          summary.averageR2 += model.jstats.R2;
          summary.weightedR2 += localityCount * model.jstats.R2;

          summary.totalClusters += 1;
          summary.totalLocalities += localityCount;
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
