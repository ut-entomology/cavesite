import type { Point } from '../lib/linear_regression';
import type { EffortData } from '../lib/effort_data';

export abstract class EffortGraphSpec {
  xAxisLabel!: string;
  yAxisLabel!: string;

  graphTitle: string;
  locationCount: number;
  pointCount = 0;
  points: Point[] = [];

  protected _priorY = 0;
  protected _cumulativePercentChange = 0;

  constructor(
    clusterEffortData: EffortData[],
    title: string,
    xAxisLabel: string,
    lowerBoundX: number,
    upperBoundX: number
  ) {
    this.locationCount = clusterEffortData.length;
    this.graphTitle = `${title} (${this.locationCount})`;
    this.xAxisLabel = xAxisLabel;

    for (const effortData of clusterEffortData) {
      this._priorY = 0; // reset at the start of each cave
      this._cumulativePercentChange = 0;
      for (const point of this._getPoints(effortData)) {
        if (point.x >= lowerBoundX && point.x <= upperBoundX) {
          this._addPoint(point);
        }
        this._priorY = point.y;
      }
    }
  }

  protected abstract _getPoints(effortData: EffortData): Point[];

  protected _addPoint(point: Point): void {
    const transformedPoint = this._transformPoint(point);
    if (transformedPoint !== null) {
      this.points.push(transformedPoint);
      ++this.pointCount;
    }
  }

  protected _transformPoint(point: Point): Point | null {
    return point;
  }

  protected _getPercentChangePoint(point: Point): Point | null {
    if (this._priorY == 0) return null;
    return { x: point.x, y: (100 * (point.y - this._priorY)) / this._priorY };
  }

  protected _getCumuPercentChangePoint(point: Point): Point | null {
    if (this._priorY == 0) return null;
    this._cumulativePercentChange += (100 * (point.y - this._priorY)) / this._priorY;
    return { x: point.x, y: this._cumulativePercentChange };
  }
}

export abstract class ByDaysGraphSpec extends EffortGraphSpec {
  constructor(
    clusterEffortData: EffortData[],
    title: string,
    minDays: number,
    maxDays: number
  ) {
    super(clusterEffortData, title, 'days', minDays, maxDays);
  }

  protected _getPoints(effortData: EffortData): Point[] {
    return effortData.perDayPoints;
  }
}

export class SpeciesByDaysGraphSpec extends ByDaysGraphSpec {
  constructor(clusterEffortData: EffortData[], minDays: number, maxDays: number) {
    super(clusterEffortData, 'Cumulative species across days', minDays, maxDays);
    this.yAxisLabel = 'cumulative species';
  }
}

export class PercentChangeByDaysGraphSpec extends ByDaysGraphSpec {
  constructor(clusterEffortData: EffortData[], minDays: number, maxDays: number) {
    super(clusterEffortData, '% change in species across days', minDays, maxDays);
    this.yAxisLabel = '% change in species';
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getPercentChangePoint(point);
  }
}

export class CumuPercentChangeByDaysGraphSpec extends ByDaysGraphSpec {
  constructor(clusterEffortData: EffortData[], minDays: number, maxDays: number) {
    super(
      clusterEffortData,
      'Cumulative % change in species across days',
      minDays,
      maxDays
    );
    this.yAxisLabel = 'cumu. % change in species';
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getCumuPercentChangePoint(point);
  }
}

export abstract class ByVisitsGraphSpec extends EffortGraphSpec {
  constructor(
    clusterEffortData: EffortData[],
    title: string,
    minVisits: number,
    maxVisits: number
  ) {
    super(clusterEffortData, title, 'visits', minVisits, maxVisits);
  }

  protected _getPoints(effortData: EffortData): Point[] {
    return effortData.perVisitPoints;
  }
}

export class SpeciesByVisitsGraphSpec extends ByVisitsGraphSpec {
  constructor(clusterEffortData: EffortData[], minVisits: number, maxVisits: number) {
    super(clusterEffortData, 'Cumulative species across visits', minVisits, maxVisits);
    this.yAxisLabel = 'cumulative species';
  }
}

export class PercentChangeByVisitsGraphSpec extends ByVisitsGraphSpec {
  constructor(clusterEffortData: EffortData[], minDays: number, maxDays: number) {
    super(
      clusterEffortData,
      'Cumulative % change in species across visits',
      minDays,
      maxDays
    );
    this.yAxisLabel = 'cumu. % change in species';
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getPercentChangePoint(point);
  }
}

export class CumuPercentChangeByVisitsGraphSpec extends ByVisitsGraphSpec {
  constructor(clusterEffortData: EffortData[], minDays: number, maxDays: number) {
    super(clusterEffortData, '% change in species across visits', minDays, maxDays);
    this.yAxisLabel = '% change in species';
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getCumuPercentChangePoint(point);
  }
}

export class ByPersonVisitsGraphSpec extends EffortGraphSpec {
  constructor(
    clusterEffortData: EffortData[],
    title: string,
    minPersonVisits: number,
    maxPersonVisits: number
  ) {
    super(clusterEffortData, title, 'person-visits', minPersonVisits, maxPersonVisits);
  }

  protected _getPoints(effortData: EffortData): Point[] {
    return effortData.perPersonVisitPoints;
  }
}

export class SpeciesByPersonVisitsGraphSpec extends ByPersonVisitsGraphSpec {
  constructor(
    clusterEffortData: EffortData[],
    minPersonVisits: number,
    maxPersonVisits: number
  ) {
    super(
      clusterEffortData,
      'Cumulative species across person-visits',
      minPersonVisits,
      maxPersonVisits
    );
    this.yAxisLabel = 'cumulative species';
  }
}

export class PercentChangeByPersonVisitsGraphSpec extends ByPersonVisitsGraphSpec {
  constructor(clusterEffortData: EffortData[], minDays: number, maxDays: number) {
    super(
      clusterEffortData,
      '% change in species across person-visits',
      minDays,
      maxDays
    );
    this.yAxisLabel = '% change in species';
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getPercentChangePoint(point);
  }
}

export class CumuPercentChangeByPersonVisitsGraphSpec extends ByPersonVisitsGraphSpec {
  constructor(clusterEffortData: EffortData[], minDays: number, maxDays: number) {
    super(
      clusterEffortData,
      'Cumulative % change in species across person-visits',
      minDays,
      maxDays
    );
    this.yAxisLabel = 'cumu. % change in species';
  }

  protected _transformPoint(point: Point): Point | null {
    return this._getCumuPercentChangePoint(point);
  }
}
