import * as jstat from 'jstat';

const MAX_SEARCH_DEPTH = 15;
const MODEL_COEF_PRECISION = 3;

export interface Point {
  x: number;
  y: number;
}

export interface JstatModel {
  coef: number[];
  R2: number;
  t: { p: number[] };
  f: { pvalue: number };
}

type XTransform = (x: number) => number[];
type YTransform = (y: number) => number;
type FittedY = (y: number) => number;
type FittedYTakingCoefs = (coefs: number[], y: number) => number;
type PlottableModelFactory = (
  dataPoints: Point[],
  yTransform: YTransform
) => PlottableModel;
type RegressionModelFactory = (dataPoints: Point[], scalar: number) => RegressionModel;

const identityY: YTransform = (y) => y;

interface RegressionModel {
  jstats: JstatModel;
  fittedY: FittedY;
  rmse: number;
  residuals: Point[];
}

export abstract class PlottableModel implements RegressionModel {
  name: string;
  hexColor: string;
  equation!: string;
  lowestX = Infinity;
  highestX = 0;

  jstats!: JstatModel;
  fittedY!: FittedY;
  rmse!: number;
  residuals!: Point[];

  private _modelPoints: Point[] | null = null;

  constructor(name: string, hexColor: string, dataPoints: Point[]) {
    this.name = name;
    this.hexColor = hexColor;
    for (const point of dataPoints) {
      if (point.x < this.lowestX) this.lowestX = point.x;
      if (point.x > this.highestX) this.highestX = point.x;
    }
  }

  abstract getXFormula(): string;

  getYFormula(): string {
    return 'y';
  }

  convertDataPoints(dataPoints: Point[]): Point[] {
    return dataPoints;
  }

  getModelPoints(pointCount: number): Point[] {
    if (!this._modelPoints || this._modelPoints.length != pointCount) {
      this._modelPoints = [];
      const deltaX = (this.highestX - this.lowestX) / pointCount;
      let x = this.lowestX;
      while (x <= this.highestX) {
        this._modelPoints.push({ x, y: this.fittedY(x) });
        x += deltaX;
      }
    }
    return this._modelPoints;
  }
}

export class QuadraticModel extends PlottableModel {
  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('quadratic fit', hexColor, dataPoints);

    const xTransform: XTransform = (x) => [x * x, x, 1];
    const fittedYTakingCoefs: FittedYTakingCoefs = (coefs, x) =>
      coefs[0] * x * x + coefs[1] * x + coefs[2];

    const model = _createRegressionModel(
      xTransform,
      yTransform,
      fittedYTakingCoefs,
      dataPoints
    );
    Object.assign(this, model);
  }

  getXFormula(): string {
    const coefs = this.jstats.coef;
    return [
      _coefHtml(coefs[0], true),
      ' x<sup>2</sup> ',
      _coefHtml(coefs[1]),
      ' x ',
      _coefHtml(coefs[2])
    ].join(' ');
  }
}

export class PowerModel extends PlottableModel {
  power: number;

  constructor(hexColor: string, dataPoints: Point[], yTransform = identityY) {
    super('power fit', hexColor, dataPoints);

    const [model, power] = _findBestRMSEScalar(
      {
        lowerBoundScalar: 0.001,
        upperBoundScalar: 3,
        maxSearchDepth: MAX_SEARCH_DEPTH
      },
      dataPoints,
      (dataPoints, scalar) => {
        return _createRegressionModel(
          (x) => [Math.pow(x, scalar), 1],
          yTransform,
          (coefs, x) => coefs[0] * Math.pow(x, scalar) + coefs[1],
          dataPoints
        );
      }
    );
    Object.assign(this, model);
    this.power = power;
  }

  getXFormula(): string {
    const coefs = this.jstats.coef;
    return [
      _coefHtml(coefs[0], true),
      ' x<sup>',
      // @ts-ignore
      shortenValue(this.power, 4),
      '</sup> ',
      _coefHtml(coefs[1])
    ].join(' ');
  }
}

export class BoxCoxModel extends PlottableModel {
  lambda: number;
  yTransform: (y: number) => number;
  private _xFormula: string;

  constructor(
    hexColor: string,
    dataPoints: Point[],
    baseModelFactory: PlottableModelFactory
  ) {
    // The name will get copied over within _findBestYScalar().
    super('' /* deferred */, hexColor, dataPoints);

    const boxCoxTransform = (lambda: number, y: number) => {
      if (lambda == 0) return Math.log(y);
      return (Math.pow(y, lambda) - 1) / lambda;
    };

    const [model, lambda] = _findBestRMSEScalar(
      {
        lowerBoundScalar: -3,
        upperBoundScalar: 3,
        maxSearchDepth: MAX_SEARCH_DEPTH
      },
      dataPoints,
      (dataPoints, scalar) =>
        baseModelFactory(dataPoints, boxCoxTransform.bind(null, scalar))
    );
    Object.assign(this, model);
    this.name += ' w/ box-cox';
    this.lambda = lambda;
    this.yTransform = boxCoxTransform.bind(null, lambda);
    this._xFormula = (model as PlottableModel).getXFormula();
  }

  convertDataPoints(dataPoints: Point[]): Point[] {
    return dataPoints.map((p) => {
      return { x: p.x, y: this.yTransform(p.y) };
    });
  }

  getXFormula(): string {
    return this._xFormula;
  }

  getYFormula(): string {
    return `bc(y, ${shortenValue(this.lambda, 3)})`;
  }
}

export function shortenValue(value: number, precision: number) {
  if (value != 0 && Math.abs(value) < 0.0001) {
    return value.toExponential(precision - 1);
  }
  return value.toPrecision(precision);
}

function _coefHtml(coef: number, firstCoef = false) {
  if (firstCoef) {
    return shortenValue(coef, MODEL_COEF_PRECISION);
  }
  return (coef >= 0 ? '+ ' : '- ') + shortenValue(Math.abs(coef), MODEL_COEF_PRECISION);
}

function _createRegressionModel(
  xTransform: XTransform,
  yTransform: YTransform,
  fittedYTakingCoefs: FittedYTakingCoefs,
  dataPoints: Point[]
): RegressionModel {
  const independentValues: number[][] = [];
  const dependentValues: number[] = [];
  for (const point of dataPoints) {
    independentValues.push(xTransform(point.x));
    dependentValues.push(yTransform(point.y));
  }

  const jstats: JstatModel = jstat.models.ols(dependentValues, independentValues);
  const coefs = jstats.coef;
  const fittedY = fittedYTakingCoefs.bind(null, coefs);
  const residuals = _getResiduals(dataPoints, fittedY);
  const rmse = _getRMSE(residuals);

  return { jstats, fittedY, rmse, residuals };
}

function _getResiduals(points: Point[], fittedY: FittedY) {
  return points.map((point) => {
    return { x: point.x, y: point.y - fittedY(point.x) };
  });
}

function _getRMSE(residuals: Point[]) {
  let sumOfSquares = 0;
  residuals.forEach((residual) => (sumOfSquares += residual.y * residual.y));
  return Math.sqrt(sumOfSquares / residuals.length);
}

function _findBestRMSEScalar(
  config: {
    lowerBoundScalar: number;
    upperBoundScalar: number;
    maxSearchDepth: number;
  },
  dataPoints: Point[],
  modelFactory: RegressionModelFactory
): [RegressionModel, number] {
  let lowModel: RegressionModel;
  let middleScalar: number;
  let middleModel: RegressionModel;
  let highModel: RegressionModel;

  lowModel = modelFactory(dataPoints, config.lowerBoundScalar);
  highModel = modelFactory(dataPoints, config.upperBoundScalar);

  let lowScalar = config.lowerBoundScalar;
  let highScalar = config.upperBoundScalar;
  for (let i = 0; i < config.maxSearchDepth; ++i) {
    middleScalar = (lowScalar + highScalar) / 2;
    middleModel = modelFactory(dataPoints, middleScalar);
    if (lowModel.rmse < highModel.rmse) {
      highScalar = middleScalar;
      highModel = middleModel;
    } else {
      lowScalar = middleScalar;
      lowModel = middleModel;
    }
  }

  // @ts-ignore
  return [middleModel, middleScalar];
}
