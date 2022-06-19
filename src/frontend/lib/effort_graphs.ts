import type { Point } from '../lib/linear_regression';
import type { EffortData } from '../lib/effort_data';

export abstract class EffortGraphSpec {
  abstract graphTitle: string;
  abstract xAxisLabel: string;
  abstract yAxisLabel: string;

  locationCount: number;
  pointCount = 0;
  points: Point[] = [];

  constructor(clusterEffortData: EffortData[]) {
    this.locationCount = clusterEffortData.length;
  }
}

export class SpeciesByDaysGraphSpec extends EffortGraphSpec {
  graphTitle: string;
  xAxisLabel: string;
  yAxisLabel: string;

  constructor(clusterEffortData: EffortData[], minDays: number, maxDays: number) {
    super(clusterEffortData);
    this.graphTitle = `Cumulative species across days (${this.locationCount} caves)`;
    this.yAxisLabel = 'cumulative species';
    this.xAxisLabel = 'days';
    for (const effortData of clusterEffortData) {
      for (const point of effortData.perDayPoints) {
        if (point.x >= minDays && point.x <= maxDays) {
          this.points.push(point);
          ++this.pointCount;
        }
      }
    }
  }
}

export class SpeciesByVisitsGraphSpec extends EffortGraphSpec {
  graphTitle: string;
  xAxisLabel: string;
  yAxisLabel: string;

  constructor(clusterEffortData: EffortData[], minVisits: number, maxVisits: number) {
    super(clusterEffortData);
    this.graphTitle = `Cumulative species across visits (${this.locationCount} caves)`;
    this.yAxisLabel = 'cumulative species';
    this.xAxisLabel = 'visits';
    for (const effortData of clusterEffortData) {
      for (const point of effortData.perVisitPoints) {
        if (point.x >= minVisits && point.x <= maxVisits) {
          this.points.push(point);
          ++this.pointCount;
        }
      }
    }
  }
}

export class SpeciesByPersonVisitsGraphSpec extends EffortGraphSpec {
  graphTitle: string;
  xAxisLabel: string;
  yAxisLabel: string;

  constructor(
    clusterEffortData: EffortData[],
    minPersonVisits: number,
    maxPersonVisits: number
  ) {
    super(clusterEffortData);
    this.locationCount = clusterEffortData.length;
    this.graphTitle = `Cumulative species across person-visits (${this.locationCount} caves)`;
    this.yAxisLabel = 'cumulative species';
    this.xAxisLabel = 'person-visits';

    for (const effortData of clusterEffortData) {
      for (const point of effortData.perPersonVisitPoints) {
        if (point.x >= minPersonVisits && point.x <= maxPersonVisits) {
          this.points.push(point);
          ++this.pointCount;
        }
      }
    }
  }
}
