import type { Point } from '../../../shared/point';
import type { ClientLocationEffort } from './client_location_effort';

export interface EffortGraphSpecPerXUnit {
  perDayTotalsGraph: GraphPointSet;
  perVisitTotalsGraph: GraphPointSet;
  perPersonVisitTotalsGraph: GraphPointSet;
}

export function createEffortGraphSpecPerXUnit(
  clientLocationEffort: ClientLocationEffort,
  lowerBoundX: number,
  minPointsToRegress: number,
  maxPointsToRegress: number
): EffortGraphSpecPerXUnit {
  return {
    perDayTotalsGraph: new SpeciesByDaysGraphSpec(
      clientLocationEffort,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    ),
    perVisitTotalsGraph: new SpeciesByVisitsGraphSpec(
      clientLocationEffort,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    ),
    perPersonVisitTotalsGraph: new SpeciesByPersonVisitsGraphSpec(
      clientLocationEffort,
      lowerBoundX,
      minPointsToRegress,
      maxPointsToRegress
    )
  };
}

export abstract class GraphPointSet {
  points: Point[] = [];

  constructor(
    clientLocationEffort: ClientLocationEffort,
    lowerBoundX: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    const effortPoints = this._getEffortPoints(clientLocationEffort);
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

  protected abstract _getEffortPoints(
    clientLocationEffort: ClientLocationEffort
  ): Point[];
}

export class SpeciesByDaysGraphSpec extends GraphPointSet {
  constructor(
    clientLocationEffort: ClientLocationEffort,
    minDays: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    super(clientLocationEffort, minDays, minPointsToRegress, maxPointsToRegress);
  }

  protected _getEffortPoints(clientLocationEffort: ClientLocationEffort): Point[] {
    return clientLocationEffort.perDayPoints;
  }
}

export class SpeciesByVisitsGraphSpec extends GraphPointSet {
  constructor(
    clientLocationEffort: ClientLocationEffort,
    minVisits: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    super(clientLocationEffort, minVisits, minPointsToRegress, maxPointsToRegress);
  }

  protected _getEffortPoints(clientLocationEffort: ClientLocationEffort): Point[] {
    return clientLocationEffort.perVisitPoints;
  }
}

export class SpeciesByPersonVisitsGraphSpec extends GraphPointSet {
  constructor(
    clientLocationEffort: ClientLocationEffort,
    minPersonVisits: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    super(
      clientLocationEffort,
      minPersonVisits,
      minPointsToRegress,
      maxPointsToRegress
    );
  }

  protected _getEffortPoints(clientLocationEffort: ClientLocationEffort): Point[] {
    return clientLocationEffort.perPersonVisitPoints;
  }
}
