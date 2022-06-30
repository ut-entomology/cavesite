import type { Point } from '../../shared/point';
import type { EffortData } from '../lib/effort_data';

export enum YAxisType {
  totalSpecies = 'total species',
  percentChange = '% change',
  cumuPercentChange = 'cumulative % change'
}

export interface MultiEffortGraphSpec {
  perDayTotalsGraph: EffortGraphSpec;
  perVisitTotalsGraph: EffortGraphSpec;
  perPersonVisitTotalsGraph: EffortGraphSpec;
}

export function createMultiEffortGraphSpec(
  yAxisType: YAxisType,
  effortData: EffortData,
  lowerBoundX: number,
  upperBoundX: number,
  minUnchangedY: number,
  zeroYBaseline: boolean
): MultiEffortGraphSpec {
  switch (yAxisType) {
    case YAxisType.totalSpecies:
      return {
        perDayTotalsGraph: new SpeciesByDaysGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perVisitTotalsGraph: new SpeciesByVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perPersonVisitTotalsGraph: new SpeciesByPersonVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        )
      };
      break;
    case YAxisType.percentChange:
      return {
        perDayTotalsGraph: new PercentChangeByDaysGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perVisitTotalsGraph: new PercentChangeByVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perPersonVisitTotalsGraph: new PercentChangeByPersonVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        )
      };
      break;
    case YAxisType.cumuPercentChange:
      return {
        perDayTotalsGraph: new CumuPercentChangeByDaysGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perVisitTotalsGraph: new CumuPercentChangeByVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perPersonVisitTotalsGraph: new CumuPercentChangeByPersonVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        )
      };
      break;
  }
}

export abstract class EffortGraphSpec {
  graphTitle: string;
  xAxisLabel!: string;
  yAxisLabel!: string;
  points: Point[] = [];

  protected _priorY = 0; // these value reset for each locality
  protected _yBaseline = 0;
  protected _cumulativePercentChange = 0;

  constructor(
    effortData: EffortData,
    title: string,
    xAxisLabel: string,
    yAxisLabel: string,
    lowerBoundX: number,
    upperBoundX: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    if (useZeroBaseline) {
      title = 'Baselined ' + title[0].toLowerCase() + title.substring(1);
      yAxisLabel = 'baselined ' + yAxisLabel;
    }
    this.graphTitle = title;
    this.xAxisLabel = xAxisLabel;
    this.yAxisLabel = yAxisLabel;

    let unchangedYCount = 0;
    let collecting = minUnchangedY == 0;
    this._priorY = 0; // reset at the start of each cave
    this._cumulativePercentChange = 0;
    this._yBaseline = 0;
    for (const point of this._getPoints(effortData)) {
      if (!collecting && minUnchangedY > 0) {
        if (point.y == this._priorY) {
          if (++unchangedYCount == minUnchangedY) collecting = true;
        } else {
          unchangedYCount = 0;
        }
      }
      if (collecting && point.x >= lowerBoundX && point.x <= upperBoundX) {
        if (useZeroBaseline && this._yBaseline == 0) {
          this._yBaseline = this._getBaselineY(point);
        }
        this._addPoint(point);
      }
      this._priorY = point.y;
    }
  }

  protected abstract _getPoints(effortData: EffortData): Point[];

  protected _addPoint(point: Point): void {
    const transformedPoint = this._transformPoint(point);
    if (transformedPoint !== null) {
      this.points.push(transformedPoint);
    }
  }

  protected _getBaselineY(point: Point): number {
    return point.y;
  }

  protected _transformPoint(point: Point): Point | null {
    if (this._yBaseline != 0) {
      return { x: point.x, y: point.y - this._yBaseline };
    }
    return point;
  }

  protected _getPercentChangePoint(point: Point): Point | null {
    if (this._priorY == this._yBaseline) return null;
    if (this._priorY < this._yBaseline)
      console.log('priorY', this._priorY, '< _yBaseline', this._yBaseline);
    return {
      x: point.x,
      y: (100 * (point.y - this._priorY)) / (this._priorY - this._yBaseline)
    };
  }

  protected _getCumuPercentChangePoint(point: Point): Point | null {
    if (this._priorY == this._yBaseline) return null;
    this._cumulativePercentChange +=
      (100 * (point.y - this._priorY)) / (this._priorY - this._yBaseline);
    return { x: point.x, y: this._cumulativePercentChange };
  }
}

export abstract class ByDaysGraphSpec extends EffortGraphSpec {
  constructor(
    effortData: EffortData,
    title: string,
    yAxisLabel: string,
    minDays: number,
    maxDays: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      title,
      'days',
      yAxisLabel,
      minDays,
      maxDays,
      minUnchangedY,
      useZeroBaseline
    );
  }

  protected _getPoints(effortData: EffortData): Point[] {
    return effortData.perDayPoints;
  }
}

export class SpeciesByDaysGraphSpec extends ByDaysGraphSpec {
  constructor(
    effortData: EffortData,
    minDays: number,
    maxDays: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      'Cumulative species across days',
      'cumulative species',
      minDays,
      maxDays,
      minUnchangedY,
      useZeroBaseline
    );
  }
}

export class PercentChangeByDaysGraphSpec extends ByDaysGraphSpec {
  constructor(
    effortData: EffortData,
    minDays: number,
    maxDays: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      '% change in species across days',
      '% change in species',
      minDays,
      maxDays,
      minUnchangedY,
      useZeroBaseline
    );
  }

  protected _getBaselineY(_point: Point): number {
    return this._priorY;
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getPercentChangePoint(point);
  }
}

export class CumuPercentChangeByDaysGraphSpec extends ByDaysGraphSpec {
  constructor(
    effortData: EffortData,
    minDays: number,
    maxDays: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      'Cumulative % change in species across days',
      'cumu. % change in species',
      minDays,
      maxDays,
      minUnchangedY,
      useZeroBaseline
    );
  }

  protected _getBaselineY(_point: Point): number {
    return this._priorY;
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getCumuPercentChangePoint(point);
  }
}

export abstract class ByVisitsGraphSpec extends EffortGraphSpec {
  constructor(
    effortData: EffortData,
    title: string,
    yAxisLabel: string,
    minVisits: number,
    maxVisits: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      title,
      'visits',
      yAxisLabel,
      minVisits,
      maxVisits,
      minUnchangedY,
      useZeroBaseline
    );
  }

  protected _getPoints(effortData: EffortData): Point[] {
    return effortData.perVisitPoints;
  }
}

export class SpeciesByVisitsGraphSpec extends ByVisitsGraphSpec {
  constructor(
    effortData: EffortData,
    minVisits: number,
    maxVisits: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      'Cumulative species across visits',
      'cumulative species',
      minVisits,
      maxVisits,
      minUnchangedY,
      useZeroBaseline
    );
  }
}

export class PercentChangeByVisitsGraphSpec extends ByVisitsGraphSpec {
  constructor(
    effortData: EffortData,
    minDays: number,
    maxDays: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      'Cumulative % change in species across visits',
      'cumu. % change in species',
      minDays,
      maxDays,
      minUnchangedY,
      useZeroBaseline
    );
  }

  protected _getBaselineY(_point: Point): number {
    return this._priorY;
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getPercentChangePoint(point);
  }
}

export class CumuPercentChangeByVisitsGraphSpec extends ByVisitsGraphSpec {
  constructor(
    effortData: EffortData,
    minDays: number,
    maxDays: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      '% change in species across visits',
      '% change in species',
      minDays,
      maxDays,
      minUnchangedY,
      useZeroBaseline
    );
  }

  protected _getBaselineY(_point: Point): number {
    return this._priorY;
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getCumuPercentChangePoint(point);
  }
}

export abstract class ByPersonVisitsGraphSpec extends EffortGraphSpec {
  constructor(
    effortData: EffortData,
    title: string,
    yAxisLabel: string,
    minPersonVisits: number,
    maxPersonVisits: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      title,
      'person-visits',
      yAxisLabel,
      minPersonVisits,
      maxPersonVisits,
      minUnchangedY,
      useZeroBaseline
    );
  }

  protected _getPoints(effortData: EffortData): Point[] {
    return effortData.perPersonVisitPoints;
  }
}

export class SpeciesByPersonVisitsGraphSpec extends ByPersonVisitsGraphSpec {
  constructor(
    effortData: EffortData,
    minPersonVisits: number,
    maxPersonVisits: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      'Cumulative species across person-visits',
      'cumulative species',
      minPersonVisits,
      maxPersonVisits,
      minUnchangedY,
      useZeroBaseline
    );
  }
}

export class PercentChangeByPersonVisitsGraphSpec extends ByPersonVisitsGraphSpec {
  constructor(
    effortData: EffortData,
    minDays: number,
    maxDays: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      '% change in species across person-visits',
      '% change in species',
      minDays,
      maxDays,
      minUnchangedY,
      useZeroBaseline
    );
  }

  protected _getBaselineY(_point: Point): number {
    return this._priorY;
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getPercentChangePoint(point);
  }
}

export class CumuPercentChangeByPersonVisitsGraphSpec extends ByPersonVisitsGraphSpec {
  constructor(
    effortData: EffortData,
    minDays: number,
    maxDays: number,
    minUnchangedY: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      'Cumulative % change in species across person-visits',
      'cumu. % change in species',
      minDays,
      maxDays,
      minUnchangedY,
      useZeroBaseline
    );
  }

  protected _getBaselineY(_point: Point): number {
    return this._priorY;
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getCumuPercentChangePoint(point);
  }
}
