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
  maxPointsToRegress: number
): EffortGraphSpecPerXUnit {
  return {
    perDayTotalsGraph: new SpeciesByDaysGraphSpec(
      effortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    ),
    perVisitTotalsGraph: new SpeciesByVisitsGraphSpec(
      effortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    ),
    perPersonVisitTotalsGraph: new SpeciesByPersonVisitsGraphSpec(
      effortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    )
  };
}

export abstract class EffortGraphSpec {
  graphTitle: string;
  xAxisLabel!: string;
  yAxisLabel!: string;
  points: Point[] = [];

  constructor(
    effortData: EffortData,
    title: string,
    xAxisLabel: string,
    yAxisLabel: string,
    lowerBoundX: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
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
        this.points.push(point);
      }
    }
  }

  protected abstract _getEffortPoints(effortData: EffortData): Point[];
}

export class SpeciesByDaysGraphSpec extends EffortGraphSpec {
  constructor(
    effortData: EffortData,
    minDays: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    super(
      effortData,
      'Cumulative species across days',
      'days',
      'cumulative species',
      minDays,
      minPointsToRegress,
      maxPointsToRegress
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
    maxPointsToRegress: number
  ) {
    super(
      effortData,
      'Cumulative species across visits',
      'visits',
      'cumulative species',
      minVisits,
      minPointsToRegress,
      maxPointsToRegress
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
    maxPointsToRegress: number
  ) {
    super(
      effortData,
      'Cumulative species across person-visits',
      'person-visits',
      'cumulative species',
      minPersonVisits,
      minPointsToRegress,
      maxPointsToRegress
    );
  }

  protected _getEffortPoints(effortData: EffortData): Point[] {
    return effortData.perPersonVisitPoints;
  }
}
