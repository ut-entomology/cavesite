import type { Point } from '../../../shared/point';
import type { EffortData } from './effort_data';

export interface EffortGraphSpecPerXUnit {
  perDayTotalsGraph: EffortGraphSpec;
  perVisitTotalsGraph: EffortGraphSpec;
  perPersonVisitTotalsGraph: EffortGraphSpec;
}

export function createEffortGraphSpecPerXUnit(
  effortData: EffortData,
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number,
  zeroYBaseline: boolean
): EffortGraphSpecPerXUnit {
  return {
    perDayTotalsGraph: new SpeciesByDaysGraphSpec(
      effortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress,
      zeroYBaseline
    ),
    perVisitTotalsGraph: new SpeciesByVisitsGraphSpec(
      effortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress,
      zeroYBaseline
    ),
    perPersonVisitTotalsGraph: new SpeciesByPersonVisitsGraphSpec(
      effortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress,
      zeroYBaseline
    )
  };
}

export abstract class EffortGraphSpec {
  graphTitle: string;
  xAxisLabel!: string;
  yAxisLabel!: string;
  points: Point[] = [];

  protected _yBaseline = 0;

  constructor(
    effortData: EffortData,
    title: string,
    xAxisLabel: string,
    yAxisLabel: string,
    lowerBoundX: number,
    minPointsToRegress: number,
    maxPointsToRegress: number,
    useZeroBaseline: boolean
  ) {
    if (useZeroBaseline) {
      title = 'Baselined ' + title[0].toLowerCase() + title.substring(1);
      yAxisLabel = 'baselined ' + yAxisLabel;
    }
    this.graphTitle = title;
    this.xAxisLabel = xAxisLabel;
    this.yAxisLabel = yAxisLabel;

    const effortPoints = this._getEffortPoints(effortData);
    for (let i = 0; i < effortPoints.length; ++i) {
      const point = effortPoints[i];
      if (point.x >= lowerBoundX) {
        if (this.points.length == 0) {
          if (effortPoints.length - i < minPointsToRegress) break;
          if (effortPoints.length - i > maxPointsToRegress) continue;
        }
        if (useZeroBaseline && this._yBaseline == 0) {
          this._yBaseline = this._getBaselineY(point);
        }
        this.points.push(this._transformPoint(point));
      }
    }
  }

  protected abstract _getEffortPoints(effortData: EffortData): Point[];

  protected _getBaselineY(point: Point): number {
    return point.y;
  }

  protected _transformPoint(point: Point): Point {
    if (this._yBaseline != 0) {
      return { x: point.x, y: point.y - this._yBaseline };
    }
    return point;
  }
}

export class SpeciesByDaysGraphSpec extends EffortGraphSpec {
  constructor(
    effortData: EffortData,
    minDays: number,
    minPointsToRegress: number,
    maxPointsToRegress: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      'Cumulative species across days',
      'days',
      'cumulative species',
      minDays,
      minPointsToRegress,
      maxPointsToRegress,
      useZeroBaseline
    );
  }

  protected _getEffortPoints(effortData: EffortData): Point[] {
    return effortData.perDayPoints;
  }
}

export class SpeciesByVisitsGraphSpec extends EffortGraphSpec {
  constructor(
    effortData: EffortData,
    minVisits: number,
    minPointsToRegress: number,
    maxPointsToRegress: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      'Cumulative species across visits',
      'visits',
      'cumulative species',
      minVisits,
      minPointsToRegress,
      maxPointsToRegress,
      useZeroBaseline
    );
  }

  protected _getEffortPoints(effortData: EffortData): Point[] {
    return effortData.perVisitPoints;
  }
}

export class SpeciesByPersonVisitsGraphSpec extends EffortGraphSpec {
  constructor(
    effortData: EffortData,
    minPersonVisits: number,
    minPointsToRegress: number,
    maxPointsToRegress: number,
    useZeroBaseline: boolean
  ) {
    super(
      effortData,
      'Cumulative species across person-visits',
      'person-visits',
      'cumulative species',
      minPersonVisits,
      minPointsToRegress,
      maxPointsToRegress,
      useZeroBaseline
    );
  }

  protected _getEffortPoints(effortData: EffortData): Point[] {
    return effortData.perPersonVisitPoints;
  }
}
