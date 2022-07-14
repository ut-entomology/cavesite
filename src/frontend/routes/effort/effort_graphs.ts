import type { Point } from '../../../shared/point';
import type { LocationEffortData } from './effort_data';

export interface EffortGraphSpecPerXUnit {
  perDayTotalsGraph: EffortGraphSpec;
  perVisitTotalsGraph: EffortGraphSpec;
  perPersonVisitTotalsGraph: EffortGraphSpec;
}

export function createEffortGraphSpecPerXUnit(
  locationEffortData: LocationEffortData,
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): EffortGraphSpecPerXUnit {
  return {
    perDayTotalsGraph: new SpeciesByDaysGraphSpec(
      locationEffortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    ),
    perVisitTotalsGraph: new SpeciesByVisitsGraphSpec(
      locationEffortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    ),
    perPersonVisitTotalsGraph: new SpeciesByPersonVisitsGraphSpec(
      locationEffortData,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    )
  };
}

export abstract class EffortGraphSpec {
  graphTitle: string;
  xAxisLabel!: string;
  yAxisLabel = 'cumulative species';
  points: Point[] = [];

  constructor(
    locationEffortData: LocationEffortData,
    title: string,
    xAxisLabel: string,
    lowerBoundX: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    this.graphTitle = title;
    this.xAxisLabel = xAxisLabel;

    const effortPoints = this._getEffortPoints(locationEffortData);
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

  protected abstract _getEffortPoints(locationEffortData: LocationEffortData): Point[];
}

export class SpeciesByDaysGraphSpec extends EffortGraphSpec {
  constructor(
    locationEffortData: LocationEffortData,
    minDays: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    super(
      locationEffortData,
      'Cumulative species across days',
      'days',
      minDays,
      minPointsToRegress,
      maxPointsToRegress
    );
  }

  protected _getEffortPoints(locationEffortData: LocationEffortData): Point[] {
    return locationEffortData.perDayPoints;
  }
}

export class SpeciesByVisitsGraphSpec extends EffortGraphSpec {
  constructor(
    locationEffortData: LocationEffortData,
    minVisits: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    super(
      locationEffortData,
      'Cumulative species across visits',
      'visits',
      minVisits,
      minPointsToRegress,
      maxPointsToRegress
    );
  }

  protected _getEffortPoints(locationEffortData: LocationEffortData): Point[] {
    return locationEffortData.perVisitPoints;
  }
}

export class SpeciesByPersonVisitsGraphSpec extends EffortGraphSpec {
  constructor(
    locationEffortData: LocationEffortData,
    minPersonVisits: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    super(
      locationEffortData,
      'Cumulative species across person-visits',
      'person-visits',
      minPersonVisits,
      minPointsToRegress,
      maxPointsToRegress
    );
  }

  protected _getEffortPoints(locationEffortData: LocationEffortData): Point[] {
    return locationEffortData.perPersonVisitPoints;
  }
}
