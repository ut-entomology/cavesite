import type { Point } from '../../../shared/point';
import type { ClientLocationEffort } from './effort_data';

export interface EffortGraphSpecPerXUnit {
  perDayTotalsGraph: EffortGraphSpec;
  perVisitTotalsGraph: EffortGraphSpec;
  perPersonVisitTotalsGraph: EffortGraphSpec;
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

export abstract class EffortGraphSpec {
  graphTitle: string;
  xAxisLabel!: string;
  yAxisLabel = 'cumulative species';
  points: Point[] = [];

  constructor(
    clientLocationEffort: ClientLocationEffort,
    title: string,
    xAxisLabel: string,
    lowerBoundX: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    this.graphTitle = title;
    this.xAxisLabel = xAxisLabel;

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

export class SpeciesByDaysGraphSpec extends EffortGraphSpec {
  constructor(
    clientLocationEffort: ClientLocationEffort,
    minDays: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    super(
      clientLocationEffort,
      'Cumulative species across days',
      'days',
      minDays,
      minPointsToRegress,
      maxPointsToRegress
    );
  }

  protected _getEffortPoints(clientLocationEffort: ClientLocationEffort): Point[] {
    return clientLocationEffort.perDayPoints;
  }
}

export class SpeciesByVisitsGraphSpec extends EffortGraphSpec {
  constructor(
    clientLocationEffort: ClientLocationEffort,
    minVisits: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    super(
      clientLocationEffort,
      'Cumulative species across visits',
      'visits',
      minVisits,
      minPointsToRegress,
      maxPointsToRegress
    );
  }

  protected _getEffortPoints(clientLocationEffort: ClientLocationEffort): Point[] {
    return clientLocationEffort.perVisitPoints;
  }
}

export class SpeciesByPersonVisitsGraphSpec extends EffortGraphSpec {
  constructor(
    clientLocationEffort: ClientLocationEffort,
    minPersonVisits: number,
    minPointsToRegress: number,
    maxPointsToRegress: number
  ) {
    super(
      clientLocationEffort,
      'Cumulative species across person-visits',
      'person-visits',
      minPersonVisits,
      minPointsToRegress,
      maxPointsToRegress
    );
  }

  protected _getEffortPoints(clientLocationEffort: ClientLocationEffort): Point[] {
    return clientLocationEffort.perPersonVisitPoints;
  }
}
