import * as jstat from 'jstat';

import type { Point } from '../../../shared/point';

export type XTransform = (x: number) => number[];
export type FittedY = (x: number) => number;
export type FittedYTakingCoefs = (coefs: number[], x: number) => number;

interface Jstats {
  coef: number[];
  R2: number;
  t: { p: number[] };
  f: { pvalue: number };
}

export class Regression {
  jstats: Jstats;
  fittedYTakingCoefs: FittedYTakingCoefs;
  fittedY!: FittedY;
  rmse!: number;
  residuals!: Point[];

  constructor(
    xTransform: XTransform,
    fittedYTakingCoefs: FittedYTakingCoefs,
    dataPoints: Point[]
  ) {
    if (dataPoints.length < 3) throw Error('REGRESSING < 3 DATA POINTS');
    const independentValues: number[][] = [];
    const dependentValues: number[] = [];
    for (const point of dataPoints) {
      independentValues.push(xTransform(point.x));
      dependentValues.push(point.y);
    }
    // Copy jstats into a new structure to jettison unused baggage.
    const jstats = jstat.models.ols(dependentValues, independentValues);
    this.jstats = {
      coef: jstats.coef,
      R2: jstats.R2,
      t: { p: jstats.t.p },
      f: { pvalue: jstats.f.pvalue }
    };
    this.fittedYTakingCoefs = fittedYTakingCoefs;
    this.evaluate(dataPoints);
  }

  evaluate(dataPoints: Point[]) {
    const coefs = this.jstats.coef;
    this.fittedY = this.fittedYTakingCoefs.bind(null, coefs);
    this.residuals = this._getResiduals(dataPoints, this.fittedY);
    this.rmse = this._getRMSE(this.residuals);
  }

  private _getResiduals(points: Point[], fittedY: FittedY) {
    return points.map((point) => {
      return { x: point.x, y: point.y - fittedY(point.x) };
    });
  }

  private _getRMSE(residuals: Point[]) {
    let sumOfSquares = 0;
    residuals.forEach((residual) => (sumOfSquares += residual.y * residual.y));
    return Math.sqrt(sumOfSquares / residuals.length);
  }
}

export function shortenValue(value: number, precision: number): string {
  if (value != 0 && Math.abs(value) < 0.001) {
    return value.toExponential(precision - 1);
  }
  return value.toPrecision(precision);
}

export function shortenPValue(pValue: number): string {
  return pValue < 0.001 ? '0.0' : shortenValue(pValue, 2);
}

export function shortenRMSE(rmse: number): string {
  return shortenValue(rmse, 3);
}

export function shortenR2(r2: number): string {
  return shortenValue(r2, 2);
}
